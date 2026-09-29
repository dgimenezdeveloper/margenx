/*
  Warnings:

  - A unique constraint covering the columns `[accountId,name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Product_accountId_name_key" ON "Product"("accountId", "name");
