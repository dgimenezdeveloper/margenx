-- CreateIndex
CREATE INDEX "Ingredient_accountId_name_idx" ON "Ingredient"("accountId", "name");

-- CreateIndex
CREATE INDEX "Product_accountId_name_idx" ON "Product"("accountId", "name");

-- CreateIndex
CREATE INDEX "Supplier_accountId_name_idx" ON "Supplier"("accountId", "name");
