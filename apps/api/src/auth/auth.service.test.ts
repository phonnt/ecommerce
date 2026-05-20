import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { signJwt, verifyJwt } from "./auth.service.js";

describe("internal JWT auth", () => {
  it("round-trips tenant and role claims", () => {
    const token = signJwt({
      sub: "user_1",
      accountId: "acct_1",
      email: "owner@example.com",
      role: "owner"
    });

    expect(verifyJwt(token)).toMatchObject({
      sub: "user_1",
      accountId: "acct_1",
      email: "owner@example.com",
      role: "owner"
    });
  });

  it("rejects a tampered token", () => {
    const token = signJwt({
      sub: "user_1",
      accountId: "acct_1",
      email: "owner@example.com",
      role: "owner"
    });

    const tampered = token.replace(/.$/, "x");

    expect(() => verifyJwt(tampered)).toThrow(UnauthorizedException);
  });
});
