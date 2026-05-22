import { describe, expect, it, vi } from "vitest";
import { SyncService } from "./sync.service.js";

describe("SyncService inventory targeting", () => {
  it("writes marketplace inventory sync quantities through the variant ledger before connector sync completes", async () => {
    const variant = {
      id: "variant_1",
      accountId: "account_1",
      productId: "product_1",
      sku: "TEE-WHT",
      name: "Default",
      price: 99000,
      onHand: 4,
      status: "active" as const,
      isDefault: true,
      updatedAt: "2026-05-22T00:00:00.000Z"
    };
    const prisma = {
      channel: { update: vi.fn(async () => ({})) },
      syncJob: { update: vi.fn(async () => ({})) }
    };
    const products = {
      findInventoryTarget: vi.fn(async () => variant)
    };
    const inventory = {
      syncVariantQuantity: vi.fn(async () => ({ ...variant, onHand: 7 }))
    };
    const service = new SyncService({ prisma: Promise.resolve(prisma) } as any, products as any, inventory as any);

    await (service as any).processUpdateInventory(
      {
        accountId: variant.accountId,
        channelId: "channel_1",
        inventory: 7,
        operation: "update_inventory",
        syncJobId: "sync_1",
        variantId: variant.id
      },
      { id: "channel_1", accountId: variant.accountId, kind: "shopee" }
    );

    expect(products.findInventoryTarget).toHaveBeenCalledWith("account_1", undefined, "variant_1");
    expect(inventory.syncVariantQuantity).toHaveBeenCalledWith("account_1", "product_1", "variant_1", 7, {
      syncJobId: "sync_1"
    });
    expect(prisma.syncJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sync_1" },
        data: expect.objectContaining({ status: "success", message: "Inventory set to 7" })
      })
    );
  });
});
