import { describe, expect, it } from "vitest";
import { connectors } from "./index.js";

describe("mock marketplace connectors", () => {
  it("normalizes a successful sandbox connection", async () => {
    const result = await connectors.shopee.connect({
      accountId: "acct_1",
      channelId: "ch_1",
      credentials: { token: "sandbox" }
    });

    expect(result).toMatchObject({ ok: true, status: "success" });
  });

  it("syncs variant inventory with variant SKU and stock", async () => {
    const result = await connectors.shopee.updateInventory({
      id: "variant_1",
      accountId: "acct_1",
      productId: "product_1",
      sku: "TEE-WHT-M",
      name: "White / M",
      price: 129000,
      onHand: 8,
      status: "active",
      isDefault: false,
      updatedAt: "2026-05-22T00:00:00.000Z"
    });

    expect(result).toMatchObject({
      externalId: "shopee-inventory-TEE-WHT-M",
      message: "Inventory set to 8"
    });
  });
});
