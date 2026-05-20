import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { ProductCreateSchema } from "@ecommerce/shared";
import type { ProductCreate } from "@ecommerce/shared";
import { Roles } from "../auth/rbac.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { ProductsService } from "./products.service.js";

@ApiTags("products")
@ApiHeader({ name: "x-account-id", required: true })
@UseGuards(RolesGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Roles("owner", "admin", "staff", "seller")
  findAll(@Headers("x-account-id") accountId: string) {
    return this.products.findAll(accountId);
  }

  @Get(":id")
  @Roles("owner", "admin", "staff", "seller")
  findOne(@Headers("x-account-id") accountId: string, @Param("id") id: string) {
    return this.products.findOne(accountId, id);
  }

  @Post()
  @Roles("owner", "admin")
  create(@Headers("x-account-id") accountId: string, @Body() body: ProductCreate) {
    const input = ProductCreateSchema.parse(body);
    return this.products.create(accountId, input);
  }

  @Patch(":id/inventory")
  @Roles("owner", "admin", "staff", "seller")
  updateInventory(
    @Headers("x-account-id") accountId: string,
    @Param("id") id: string,
    @Body("inventory") inventory: number
  ) {
    return this.products.updateInventory(accountId, id, Number(inventory));
  }
}
