-- El índice raw por cuenta/nombre debe evitar recrearse si ya existe en la base
-- (por ejemplo, al aplicar la migración desde un estado limpio o al reintentar CI).
CREATE INDEX IF NOT EXISTS "Ingredient_accountId_name_idx" ON "Ingredient"("accountId", "name");
CREATE INDEX IF NOT EXISTS "Product_accountId_name_idx" ON "Product"("accountId", "name");
CREATE INDEX IF NOT EXISTS "Supplier_accountId_name_idx" ON "Supplier"("accountId", "name");
