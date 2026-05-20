import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PUBLIC_KEY } from "./rbac.js";
import { verifyJwt } from "./auth.service.js";
import type { JwtClaims } from "./auth.service.js";

type RequestLike = {
  header(name: string): string | undefined;
  headers: Record<string, string | string[] | JwtClaims | undefined>;
  user?: JwtClaims;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const authorization = request.header("authorization");
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!bearer) {
      if (process.env.ALLOW_DEV_TENANT_HEADER === "true") {
        const accountId = request.header("x-account-id");
        const role = request.header("x-role") ?? "owner";
        if (accountId) {
          request.user = { sub: "dev-user", accountId, role: role as JwtClaims["role"], email: "dev@example.com" };
          request.headers["x-account-id"] = accountId;
          return true;
        }
      }
      throw new UnauthorizedException("Missing bearer token");
    }

    const claims = verifyJwt(bearer);
    request.user = claims;
    request.headers["x-account-id"] = claims.accountId;
    return true;
  }
}
