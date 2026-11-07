-- Issue #242 (SPRINT5-BE-01): unicidad de nombre por cuenta sin distinguir mayúsculas.
--
-- Prisma no admite índices sobre expresiones en schema.prisma, así que la regla
-- vive solo en esta migración. Si un `prisma migrate dev` futuro genera un
-- DROP INDEX de algún "*_accountId_lower_name_key", hay que quitarlo a mano:
-- la prueba "schema Prisma y migración" de src/routes/products.test.ts falla
-- si alguna migración posterior borra estos índices.
--
-- Auditoría previa (alcance §1 de la issue). Antes de aplicar en una base con
-- datos, esta consulta debe devolver 0 filas por tabla; si no, depurar primero:
--   SELECT "accountId", lower("name"), count(*) FROM "Product"
--   GROUP BY 1, 2 HAVING count(*) > 1;
--   (ídem para "Supplier" e "Ingredient")

-- Las claves únicas exactas quedan cubiertas por las case-insensitive.
DROP INDEX "Product_accountId_name_key";
DROP INDEX "Supplier_accountId_name_key";

-- Índices de acceso declarados con @@index([accountId, name]) en schema.prisma.
CREATE INDEX "Ingredient_accountId_name_idx" ON "Ingredient"("accountId", "name");
CREATE INDEX "Product_accountId_name_idx" ON "Product"("accountId", "name");
CREATE INDEX "Supplier_accountId_name_idx" ON "Supplier"("accountId", "name");

-- Unicidad case-insensitive por cuenta.
CREATE UNIQUE INDEX "Supplier_accountId_lower_name_key" ON "Supplier"("accountId", lower("name"));
CREATE UNIQUE INDEX "Ingredient_accountId_lower_name_key" ON "Ingredient"("accountId", lower("name"));
CREATE UNIQUE INDEX "Product_accountId_lower_name_key" ON "Product"("accountId", lower("name"));
