import { SetMetadata } from "@nestjs/common";
import type { Role } from "@ecommerce/shared";

export const ROLES_KEY = "roles";
export const PUBLIC_KEY = "public";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(PUBLIC_KEY, true);
