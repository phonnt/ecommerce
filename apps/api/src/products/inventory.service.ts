import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { InventoryAdjustmentRequest } from "@ecommerce/shared";
import { DatabaseService } from "../database/database.service.js";
import { toVariantDto } from "./products.service.js";

type LedgerMetadata = {
  actorUserId?: string;
  syncJobId?: string;
};

@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService) {}

  async adjustVariant(
    accountId: string,
    productId: string,
    variantId: string,
    input: InventoryAdjustmentRequest,
    metadata: LedgerMetadata = {}
  ) {
    return this.adjust(accountId, productId, variantId, input, "manual_adjustment", metadata);
  }

  async syncVariantQuantity(
    accountId: string,
    productId: string,
    variantId: string,
    quantity: number,
    metadata: LedgerMetadata = {}
  ) {
    const prisma = await this.database.prisma;
    const variant = await this.findVariant(prisma, accountId, productId, variantId);
    if (variant.onHand === quantity) {
      return toVariantDto(variant);
    }

    return this.adjust(
      accountId,
      productId,
      variantId,
      { delta: quantity - variant.onHand },
      "marketplace_sync",
      metadata
    );
  }

  async setDefaultInventory(accountId: string, productId: string, inventory: number, actorUserId?: string) {
    if (!Number.isInteger(inventory) || inventory < 0) {
      throw new BadRequestException("Inventory must be a nonnegative integer");
    }

    const prisma = await this.database.prisma;
    const variant = await prisma.productVariant.findFirst({
      where: { accountId, productId, isDefault: true }
    });

    if (!variant) {
      throw new NotFoundException("Default variant not found");
    }

    await this.adjustVariant(
      accountId,
      productId,
      variant.id,
      {
        delta: inventory - variant.onHand,
        note: "Legacy product inventory update"
      },
      { actorUserId }
    );
  }

  async findLedger(accountId: string, productId: string, variantId: string) {
    const prisma = await this.database.prisma;
    await this.findVariant(prisma, accountId, productId, variantId);
    const entries = await prisma.inventoryLedgerEntry.findMany({
      where: { accountId, productId, variantId },
      orderBy: { createdAt: "desc" }
    });

    return entries.map(toLedgerDto);
  }

  private async adjust(
    accountId: string,
    productId: string,
    variantId: string,
    input: InventoryAdjustmentRequest,
    type: "manual_adjustment" | "marketplace_sync",
    metadata: LedgerMetadata
  ) {
    if (!Number.isInteger(input.delta)) {
      throw new BadRequestException("Inventory delta must be an integer");
    }

    const prisma = await this.database.prisma;
    return prisma.$transaction(async (transaction: any) => {
      const variant = await this.findVariant(transaction, accountId, productId, variantId);
      const quantityAfter = variant.onHand + input.delta;

      if (quantityAfter < 0) {
        throw new BadRequestException("Inventory cannot be negative");
      }

      const updated = await transaction.productVariant.update({
        where: { id: variant.id },
        data: { onHand: quantityAfter }
      });

      await transaction.inventoryLedgerEntry.create({
        data: {
          accountId,
          productId,
          variantId,
          type,
          delta: input.delta,
          quantityBefore: variant.onHand,
          quantityAfter,
          note: input.note ?? null,
          actorUserId: metadata.actorUserId ?? null,
          syncJobId: metadata.syncJobId ?? null
        }
      });

      if (variant.isDefault) {
        await transaction.product.update({
          where: { id: productId },
          data: { inventory: quantityAfter }
        });
      }

      return toVariantDto(updated);
    });
  }

  private async findVariant(prisma: any, accountId: string, productId: string, variantId: string) {
    const variant = await prisma.productVariant.findFirst({
      where: { accountId, productId, id: variantId }
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    return variant;
  }
}

function toLedgerDto(entry: any) {
  return {
    id: entry.id,
    accountId: entry.accountId,
    productId: entry.productId,
    variantId: entry.variantId,
    type: entry.type,
    delta: entry.delta,
    quantityBefore: entry.quantityBefore,
    quantityAfter: entry.quantityAfter,
    note: entry.note,
    actorUserId: entry.actorUserId,
    syncJobId: entry.syncJobId,
    createdAt: entry.createdAt.toISOString()
  };
}
