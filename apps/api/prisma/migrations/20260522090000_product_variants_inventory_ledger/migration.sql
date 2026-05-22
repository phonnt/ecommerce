-- CreateEnum
CREATE TYPE "InventoryLedgerType" AS ENUM ('manual_adjustment', 'marketplace_sync');

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "onHand" INTEGER NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "InventoryLedgerType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantityBefore" INTEGER NOT NULL,
    "quantityAfter" INTEGER NOT NULL,
    "syncJobId" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- Backfill the default variant before variant inventory becomes authoritative.
INSERT INTO "ProductVariant" (
    "id",
    "accountId",
    "productId",
    "sku",
    "name",
    "price",
    "onHand",
    "status",
    "isDefault",
    "createdAt",
    "updatedAt"
)
SELECT
    CONCAT('variant_', "id"),
    "accountId",
    "id",
    "sku",
    'Default',
    "price",
    "inventory",
    "status",
    true,
    "createdAt",
    "updatedAt"
FROM "Product";

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_accountId_sku_key" ON "ProductVariant"("accountId", "sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_isDefault_idx" ON "ProductVariant"("productId", "isDefault");

-- CreateIndex
CREATE INDEX "ProductVariant_accountId_status_idx" ON "ProductVariant"("accountId", "status");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_accountId_createdAt_idx" ON "InventoryLedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLedgerEntry_variantId_createdAt_idx" ON "InventoryLedgerEntry"("variantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedgerEntry" ADD CONSTRAINT "InventoryLedgerEntry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
