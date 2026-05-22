import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProductsService } from "./products.service.js";

describe("ProductsService variants", () => {
  it("creates a product with a default variant for the V1 product request", async () => {
    const productCreate = vi.fn(async ({ data }) => ({
      id: "product_1",
      accountId: data.accountId,
      sku: data.sku,
      name: data.name,
      slug: data.slug,
      price: data.price,
      inventory: data.inventory,
      status: data.status,
      updatedAt: new Date("2026-05-22T00:00:00.000Z"),
      variants: [
        {
          id: "variant_1",
          productId: "product_1",
          accountId: data.accountId,
          ...data.variants.create,
          updatedAt: new Date("2026-05-22T00:00:00.000Z")
        }
      ]
    }));
    const service = createService({
      account: { upsert: vi.fn() },
      product: { create: productCreate }
    });

    const product = await service.create("account_1", {
      name: "Everyday Tee",
      sku: "TEE-DEFAULT",
      price: 99000,
      inventory: 6,
      status: "active"
    });

    expect(product.variants[0]).toMatchObject({
      sku: "TEE-DEFAULT",
      onHand: 6,
      isDefault: true
    });
    expect(productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          variants: {
            create: expect.objectContaining({ sku: "TEE-DEFAULT", isDefault: true })
          }
        })
      })
    );
  });

  it("rejects duplicate variant SKUs inside an account", async () => {
    const service = createService({
      product: {
        findFirst: vi.fn(async () => ({ id: "product_1" }))
      },
      productVariant: {
        findFirst: vi.fn(async () => ({ id: "variant_existing" }))
      }
    });

    await expect(
      service.createVariant("account_1", "product_1", {
        name: "Large",
        sku: "TEE-DEFAULT",
        price: 109000,
        onHand: 2,
        status: "active"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("falls back to the default variant for product-scoped inventory sync", async () => {
    const findFirst = vi.fn(async ({ where }) => ({
      id: "variant_default",
      accountId: where.accountId,
      productId: where.productId,
      sku: "TEE-DEFAULT",
      name: "Default",
      price: 99000,
      onHand: 6,
      status: "active",
      isDefault: where.isDefault,
      updatedAt: new Date("2026-05-22T00:00:00.000Z")
    }));
    const service = createService({
      productVariant: { findFirst }
    });

    const variant = await service.findInventoryTarget("account_1", "product_1");

    expect(variant.id).toBe("variant_default");
    expect(findFirst).toHaveBeenCalledWith({
      where: { accountId: "account_1", productId: "product_1", isDefault: true }
    });
  });

  it("does not publish active products without active variants", async () => {
    const service = createService({
      product: {
        findMany: vi.fn(async () => [
          {
            id: "product_1",
            accountId: "account_1",
            sku: "TEE-DEFAULT",
            name: "Everyday Tee",
            slug: "everyday-tee",
            price: 99000,
            inventory: 6,
            status: "active",
            updatedAt: new Date("2026-05-22T00:00:00.000Z"),
            variants: []
          }
        ])
      }
    });

    await expect(service.findPublic()).resolves.toEqual([]);
  });
});

function createService(prisma: unknown) {
  return new ProductsService({ prisma: Promise.resolve(prisma) } as any);
}
