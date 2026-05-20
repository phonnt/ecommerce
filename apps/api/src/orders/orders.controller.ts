import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/rbac.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("orders")
@ApiHeader({ name: "x-account-id", required: true })
@UseGuards(RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Roles("owner", "admin", "staff", "seller")
  findAll(@Headers("x-account-id") accountId: string) {
    return this.orders.findAll(accountId);
  }
}
