import { describe, expect, it, vi } from "vitest";
import { ProductsController } from "./products.controller.js";

describe("ProductsController inventory routes", () => {
  it("delegates variant adjustment requests with the authenticated actor", async () => {
    const products = {};
    const inventory = {
      adjustVariant: vi.fn(async () => ({ id: "variant_1" }))
    };
    const controller = new ProductsController(products as any, inventory as any);

    await controller.adjustVariantInventory(
      "account_1",
      "product_1",
      "variant_1",
      { delta: 2, note: "Counted" },
      { user: { sub: "user_1" } }
    );

    expect(inventory.adjustVariant).toHaveBeenCalledWith(
      "account_1",
      "product_1",
      "variant_1",
      { delta: 2, note: "Counted" },
      { actorUserId: "user_1" }
    );
  });

  it("keeps legacy product inventory writes on the ledger-backed default variant path", async () => {
    const products = {
      findOne: vi.fn(async () => ({ id: "product_1" }))
    };
    const inventory = {
      setDefaultInventory: vi.fn(async () => undefined)
    };
    const controller = new ProductsController(products as any, inventory as any);

    await controller.updateInventory("account_1", "product_1", 9, { user: { sub: "user_1" } });

    expect(inventory.setDefaultInventory).toHaveBeenCalledWith("account_1", "product_1", 9, "user_1");
    expect(products.findOne).toHaveBeenCalledWith("account_1", "product_1");
  });
});
