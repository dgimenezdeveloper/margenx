-- El índice raw por nombre no garantiza unicidad case-insensitive; se reemplaza por
-- la estrategia funcional requerida por la issue y se vuelve idempotente para CI.
DROP INDEX IF EXISTS "Ingredient_accountId_name_idx";
DROP INDEX IF EXISTS "Product_accountId_name_idx";
DROP INDEX IF EXISTS "Supplier_accountId_name_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Ingredient_accountId_lower_name_key"
  ON "Ingredient"("accountId", lower("name"));

CREATE UNIQUE INDEX IF NOT EXISTS "Product_accountId_lower_name_key"
  ON "Product"("accountId", lower("name"));

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_accountId_lower_name_key"
  ON "Supplier"("accountId", lower("name"));
