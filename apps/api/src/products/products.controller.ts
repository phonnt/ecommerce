import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBody, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  InventoryAdjustmentRequestSchema,
  ProductCreateSchema,
  ProductVariantCreateSchema,
  ProductVariantUpdateSchema
} from "@ecommerce/shared";
import type { InventoryAdjustmentRequest, ProductCreate, ProductVariantCreate, ProductVariantUpdate } from "@ecommerce/shared";
import { Roles } from "../auth/rbac.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { InventoryService } from "./inventory.service.js";
import {
  InventoryAdjustmentRequestDto,
  InventoryLedgerEntryDto,
  ProductDto,
  ProductVariantCreateDto,
  ProductVariantDto,
  ProductVariantUpdateDto
} from "./products.openapi.js";
import { ProductsService } from "./products.service.js";

type RequestWithUser = {
  user?: { sub?: string };
};

@ApiTags("products")
@ApiHeader({ name: "x-account-id", required: true })
@UseGuards(RolesGuard)
@Controller("products")
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly inventory: InventoryService
  ) {}

  @Get()
  @Roles("owner", "admin", "staff", "seller")
  @ApiOkResponse({ type: [ProductDto] })
  findAll(@Headers("x-account-id") accountId: string) {
    return this.products.findAll(accountId);
  }

  @Get(":id")
  @Roles("owner", "admin", "staff", "seller")
  @ApiOkResponse({ type: ProductDto })
  findOne(@Headers("x-account-id") accountId: string, @Param("id") id: string) {
    return this.products.findOne(accountId, id);
  }

  @Post()
  @Roles("owner", "admin")
  @ApiCreatedResponse({ type: ProductDto })
  create(@Headers("x-account-id") accountId: string, @Body() body: ProductCreate) {
    const input = ProductCreateSchema.parse(body);
    return this.products.create(accountId, input);
  }

  @Get(":productId/variants")
  @Roles("owner", "admin", "staff", "seller")
  @ApiOkResponse({ type: [ProductVariantDto] })
  findVariants(@Headers("x-account-id") accountId: string, @Param("productId") productId: string) {
    return this.products.findVariants(accountId, productId);
  }

  @Post(":productId/variants")
  @Roles("owner", "admin")
  @ApiBody({ type: ProductVariantCreateDto })
  @ApiCreatedResponse({ type: ProductVariantDto })
  createVariant(
    @Headers("x-account-id") accountId: string,
    @Param("productId") productId: string,
    @Body() body: ProductVariantCreate
  ) {
    const input = ProductVariantCreateSchema.parse(body);
    return this.products.createVariant(accountId, productId, input);
  }

  @Patch(":productId/variants/:variantId")
  @Roles("owner", "admin")
  @ApiBody({ type: ProductVariantUpdateDto })
  @ApiOkResponse({ type: ProductVariantDto })
  updateVariant(
    @Headers("x-account-id") accountId: string,
    @Param("productId") productId: string,
    @Param("variantId") variantId: string,
    @Body() body: ProductVariantUpdate
  ) {
    const input = ProductVariantUpdateSchema.parse(body);
    return this.products.updateVariant(accountId, productId, variantId, input);
  }

  @Post(":productId/variants/:variantId/inventory-adjustments")
  @Roles("owner", "admin", "staff", "seller")
  @ApiBody({ type: InventoryAdjustmentRequestDto })
  @ApiCreatedResponse({ type: ProductVariantDto })
  adjustVariantInventory(
    @Headers("x-account-id") accountId: string,
    @Param("productId") productId: string,
    @Param("variantId") variantId: string,
    @Body() body: InventoryAdjustmentRequest,
    @Req() request: RequestWithUser
  ) {
    const input = InventoryAdjustmentRequestSchema.parse(body);
    return this.inventory.adjustVariant(accountId, productId, variantId, input, {
      actorUserId: request.user?.sub
    });
  }

  @Get(":productId/variants/:variantId/inventory-ledger")
  @Roles("owner", "admin", "staff", "seller")
  @ApiOkResponse({ type: [InventoryLedgerEntryDto] })
  findVariantInventoryLedger(
    @Headers("x-account-id") accountId: string,
    @Param("productId") productId: string,
    @Param("variantId") variantId: string
  ) {
    return this.inventory.findLedger(accountId, productId, variantId);
  }

  @Patch(":id/inventory")
  @Roles("owner", "admin", "staff", "seller")
  @ApiOkResponse({ type: ProductDto })
  async updateInventory(
    @Headers("x-account-id") accountId: string,
    @Param("id") id: string,
    @Body("inventory") inventory: number,
    @Req() request: RequestWithUser
  ) {
    await this.inventory.setDefaultInventory(accountId, id, Number(inventory), request.user?.sub);
    return this.products.findOne(accountId, id);
  }
}
