import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const productStatuses = ["draft", "active", "archived"] as const;
const ledgerTypes = ["manual_adjustment", "marketplace_sync"] as const;

export class ProductVariantDto {
  @ApiProperty({ example: "variant_123" })
  id!: string;

  @ApiProperty({ example: "demo-account" })
  accountId!: string;

  @ApiProperty({ example: "product_123" })
  productId!: string;

  @ApiProperty({ example: "TEE-WHT-M" })
  sku!: string;

  @ApiProperty({ example: "White / M" })
  name!: string;

  @ApiProperty({ example: 490000, minimum: 0 })
  price!: number;

  @ApiProperty({ example: 18, minimum: 0 })
  onHand!: number;

  @ApiProperty({ enum: productStatuses, example: "active" })
  status!: (typeof productStatuses)[number];

  @ApiProperty({ example: false })
  isDefault!: boolean;

  @ApiProperty({ example: "2026-05-22T08:00:00.000Z" })
  updatedAt!: string;
}

export class ProductDto {
  @ApiProperty({ example: "product_123" })
  id!: string;

  @ApiProperty({ example: "demo-account" })
  accountId!: string;

  @ApiProperty({ example: "TEE-WHT" })
  sku!: string;

  @ApiProperty({ example: "Linen Everyday Tee" })
  name!: string;

  @ApiProperty({ example: "linen-everyday-tee" })
  slug!: string;

  @ApiProperty({ example: 490000, minimum: 0 })
  price!: number;

  @ApiProperty({ example: 18, minimum: 0 })
  inventory!: number;

  @ApiProperty({ enum: productStatuses, example: "active" })
  status!: (typeof productStatuses)[number];

  @ApiProperty({ example: "2026-05-22T08:00:00.000Z" })
  updatedAt!: string;

  @ApiProperty({ type: [ProductVariantDto] })
  variants!: ProductVariantDto[];
}

export class ProductVariantCreateDto {
  @ApiProperty({ example: "White / M" })
  name!: string;

  @ApiProperty({ example: "TEE-WHT-M" })
  sku!: string;

  @ApiProperty({ example: 490000, minimum: 0 })
  price!: number;

  @ApiProperty({ example: 18, minimum: 0 })
  onHand!: number;

  @ApiProperty({ enum: productStatuses, example: "active" })
  status!: (typeof productStatuses)[number];
}

export class ProductVariantUpdateDto {
  @ApiPropertyOptional({ example: "White / M" })
  name?: string;

  @ApiPropertyOptional({ example: "TEE-WHT-M" })
  sku?: string;

  @ApiPropertyOptional({ example: 490000, minimum: 0 })
  price?: number;

  @ApiPropertyOptional({ enum: productStatuses, example: "active" })
  status?: (typeof productStatuses)[number];
}

export class InventoryAdjustmentRequestDto {
  @ApiProperty({ example: -2, description: "Signed stock change applied to the variant." })
  delta!: number;

  @ApiPropertyOptional({ example: "Cycle count correction" })
  note?: string;
}

export class InventoryLedgerEntryDto {
  @ApiProperty({ example: "ledger_123" })
  id!: string;

  @ApiProperty({ example: "demo-account" })
  accountId!: string;

  @ApiProperty({ example: "product_123" })
  productId!: string;

  @ApiProperty({ example: "variant_123" })
  variantId!: string;

  @ApiProperty({ enum: ledgerTypes, example: "manual_adjustment" })
  type!: (typeof ledgerTypes)[number];

  @ApiProperty({ example: -2 })
  delta!: number;

  @ApiProperty({ example: 18, minimum: 0 })
  quantityBefore!: number;

  @ApiProperty({ example: 16, minimum: 0 })
  quantityAfter!: number;

  @ApiPropertyOptional({ example: "Cycle count correction", nullable: true })
  note!: string | null;

  @ApiPropertyOptional({ example: "user_123", nullable: true })
  actorUserId!: string | null;

  @ApiPropertyOptional({ example: "sync_123", nullable: true })
  syncJobId!: string | null;

  @ApiProperty({ example: "2026-05-22T08:00:00.000Z" })
  createdAt!: string;
}
