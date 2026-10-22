-- AlterTable
ALTER TABLE "SupplierIngredient"
  ADD COLUMN "pendingPackagePrice" DECIMAL(10,2),
  ADD COLUMN "quarantinedAt" TIMESTAMP(3),
  ADD COLUMN "quarantineReason" TEXT;
