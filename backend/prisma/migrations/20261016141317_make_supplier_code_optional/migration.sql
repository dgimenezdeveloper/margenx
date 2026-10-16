/*
  Warnings:

  - A unique constraint covering the columns `[supplierId,supplierCode]` on the table `SupplierIngredient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SupplierIngredient" ADD COLUMN     "rawDescription" TEXT,
ADD COLUMN     "supplierCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SupplierIngredient_supplierId_supplierCode_key" ON "SupplierIngredient"("supplierId", "supplierCode");
