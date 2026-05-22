import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { InventoryService } from "./inventory.service.js";

const initialVariant = {
  id: "variant_1",
  accountId: "account_1",
  productId: "product_1",
  sku: "TEE-WHT",
  name: "White",
  price: 120000,
  onHand: 4,
  status: "active" as const,
  isDefault: true,
  updatedAt: new Date("2026-05-22T00:00:00.000Z")
};

describe("InventoryService", () => {
  it("updates variant inventory and appends a ledger entry in one adjustment", async () => {
    const store = createPrismaStore();
    const service = createService(store.prisma);

    const variant = await service.adjustVariant(
      initialVariant.accountId,
      initialVariant.productId,
      initialVariant.id,
      { delta: 3, note: "Cycle count" },
      { actorUserId: "user_1" }
    );

    expect(variant.onHand).toBe(7);
    expect(store.variant.onHand).toBe(7);
    expect(store.ledger).toEqual([
      expect.objectContaining({
        type: "manual_adjustment",
        delta: 3,
        quantityBefore: 4,
        quantityAfter: 7,
        note: "Cycle count",
        actorUserId: "user_1"
      })
    ]);
    expect(store.productUpdate).toHaveBeenCalledWith({
      where: { id: initialVariant.productId },
      data: { inventory: 7 }
    });
  });

  it("rejects adjustments that would make variant inventory negative", async () => {
    const store = createPrismaStore();
    const service = createService(store.prisma);

    await expect(
      service.adjustVariant(initialVariant.accountId, initialVariant.productId, initialVariant.id, {
        delta: -5
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(store.variant.onHand).toBe(4);
    expect(store.ledger).toHaveLength(0);
  });

  it("does not read ledger entries for a variant outside the tenant", async () => {
    const store = createPrismaStore();
    const service = createService(store.prisma);

    await expect(service.findLedger("account_2", initialVariant.productId, initialVariant.id)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});

function createService(prisma: unknown) {
  return new InventoryService({ prisma: Promise.resolve(prisma) } as any);
}

function createPrismaStore() {
  const variant = { ...initialVariant };
  const ledger: any[] = [];
  const productUpdate = vi.fn(async () => ({ id: initialVariant.productId }));
  const transaction = {
    productVariant: {
      findFirst: vi.fn(async ({ where }) =>
        where.accountId === variant.accountId && where.productId === variant.productId && where.id === variant.id
          ? { ...variant }
          : null
      ),
      update: vi.fn(async ({ data }) => {
        Object.assign(variant, data);
        return { ...variant };
      })
    },
    inventoryLedgerEntry: {
      create: vi.fn(async ({ data }) => {
        const entry = {
          id: `ledger_${ledger.length + 1}`,
          createdAt: new Date("2026-05-22T01:00:00.000Z"),
          ...data
        };
        ledger.push(entry);
        return entry;
      }),
      findMany: vi.fn(async () => ledger)
    },
    product: {
      update: productUpdate
    }
  };

  return {
    ledger,
    productUpdate,
    variant,
    prisma: {
      ...transaction,
      $transaction: vi.fn(async (run) => run(transaction))
    }
  };
}
