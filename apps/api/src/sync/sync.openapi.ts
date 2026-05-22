import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SyncInventoryRequestDto {
  @ApiProperty({ example: "channel_1" })
  channelId!: string;

  @ApiPropertyOptional({ example: "variant_123", description: "Primary inventory sync target." })
  variantId?: string;

  @ApiPropertyOptional({ example: "product_123", description: "Fallback target resolved to the default variant." })
  productId?: string;

  @ApiPropertyOptional({
    example: 18,
    minimum: 0,
    description: "Quantity observed during marketplace sync. When present it updates local variant stock through the ledger."
  })
  inventory?: number;
}
