import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VariantDetail } from "./variant-detail";

describe("VariantDetail", () => {
  it("renders the default active variant summary on product detail", () => {
    const markup = renderToStaticMarkup(
      createElement(VariantDetail, {
        status: "active",
        variants: [
          {
            id: "variant_1",
            accountId: "account_1",
            productId: "product_1",
            sku: "TEE-BLK",
            name: "Black",
            price: 129000,
            onHand: 3,
            status: "active",
            isDefault: false,
            updatedAt: "2026-05-22T00:00:00.000Z"
          },
          {
            id: "variant_2",
            accountId: "account_1",
            productId: "product_1",
            sku: "TEE-WHT",
            name: "White",
            price: 139000,
            onHand: 8,
            status: "active",
            isDefault: true,
            updatedAt: "2026-05-22T00:00:00.000Z"
          }
        ]
      })
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain(">White</button>");
    expect(markup).toContain("TEE-WHT");
    expect(markup).toContain("<dd>8</dd>");
  });
});
