import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { permissionsByRole } from "@ecommerce/shared";
import type { AuthUser, LoginRequest, RegisterRequest, Role } from "@ecommerce/shared";
import { DatabaseService } from "../database/database.service.js";

type UserRecord = {
  id: string;
  accountId: string;
  email: string;
  passwordHash: string;
  role: Role;
};

export type JwtClaims = {
  sub: string;
  accountId: string;
  role: Role;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async login(input: LoginRequest) {
    const prisma = await this.database.prisma;
    const user = (await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })) as UserRecord | null;

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return {
      token: signJwt({
        sub: user.id,
        accountId: user.accountId,
        role: user.role,
        email: user.email
      }),
      user: toAuthUser(user)
    };
  }

  async register(input: RegisterRequest) {
    const prisma = await this.database.prisma;
    const account = await prisma.account.create({
      data: { name: input.accountName ?? input.email.split("@")[0] }
    });
    const user = (await prisma.user.create({
      data: {
        accountId: account.id,
        email: input.email.toLowerCase(),
        passwordHash: hashPassword(input.password),
        role: "owner"
      }
    })) as UserRecord;

    return {
      token: signJwt({
        sub: user.id,
        accountId: user.accountId,
        role: user.role,
        email: user.email
      }),
      user: toAuthUser(user)
    };
  }

  async me(claims: JwtClaims): Promise<AuthUser> {
    const prisma = await this.database.prisma;
    const user = (await prisma.user.findFirst({
      where: { id: claims.sub, accountId: claims.accountId }
    })) as UserRecord | null;

    if (!user) {
      throw new UnauthorizedException("User no longer exists");
    }

    return toAuthUser(user);
  }
}

export function signJwt(claims: JwtClaims) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: now, exp: now + 60 * 60 * 12 };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", jwtSecret()).update(`${encodedHeader}.${encodedPayload}`).digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJwt(token: string): JwtClaims {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new UnauthorizedException("Invalid bearer token");
  }

  const expected = createHmac("sha256", jwtSecret()).update(`${header}.${payload}`).digest("base64url");
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new UnauthorizedException("Invalid bearer token");
  }

  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtClaims & { exp?: number };
  if (!claims.sub || !claims.accountId || !claims.role || (claims.exp && claims.exp < Math.floor(Date.now() / 1000))) {
    throw new UnauthorizedException("Expired or invalid bearer token");
  }

  return claims;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string) {
  const [, salt, hash] = encoded.split(":");
  if (!salt || !hash) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "base64url");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    return "local-dev-secret-change-me";
  }
  return secret;
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    accountId: user.accountId,
    email: user.email,
    role: user.role,
    permissions: permissionsByRole[user.role]
  };
}
