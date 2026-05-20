import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./rbac.js";
import type { Role } from "@ecommerce/shared";

type RequestLike = {
  header(name: string): string | undefined;
  user?: { role: Role };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const role = request.user?.role;

    if (!role || !required.includes(role)) {
      throw new ForbiddenException(`Role ${role} cannot access this resource`);
    }

    return true;
  }
}
