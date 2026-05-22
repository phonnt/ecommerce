import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("product variant migration", () => {
  it("backfills every legacy product into a default variant with its SKU, price, and inventory", () => {
    const migration = readFileSync(
      resolve(process.cwd(), "prisma/migrations/20260522090000_product_variants_inventory_ledger/migration.sql"),
      "utf8"
    );

    expect(migration).toContain('INSERT INTO "ProductVariant"');
    expect(migration).toContain('"sku",');
    expect(migration).toContain('"price",');
    expect(migration).toContain('"inventory",');
    expect(migration).toContain("true,");
    expect(migration).toContain('FROM "Product";');
  });
});
