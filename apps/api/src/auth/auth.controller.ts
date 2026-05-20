import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { LoginRequestSchema, RegisterRequestSchema } from "@ecommerce/shared";
import { Public } from "./rbac.js";
import { AuthService } from "./auth.service.js";
import type { JwtClaims } from "./auth.service.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: unknown) {
    return this.auth.login(LoginRequestSchema.parse(body));
  }

  @Public()
  @Post("register")
  register(@Body() body: unknown) {
    return this.auth.register(RegisterRequestSchema.parse(body));
  }

  @Get("me")
  @ApiBearerAuth()
  me(@Req() request: { user: JwtClaims }) {
    return this.auth.me(request.user);
  }
}
