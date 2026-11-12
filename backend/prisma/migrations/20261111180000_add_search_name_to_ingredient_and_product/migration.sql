-- AlterTable: Agregar columna searchName para búsqueda insensible a mayúsculas y acentos (Issue #366)
ALTER TABLE "Ingredient" ADD COLUMN IF NOT EXISTS "searchName" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "searchName" TEXT;

-- Backfill de filas existentes normalizando minúsculas y removiendo acentos / diacríticos / ñ -> n
UPDATE "Ingredient"
SET "searchName" = lower(
  translate(
    "name",
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑáàäâãéèëêíìïîóòöôõúùüûñ',
    'aaaaaeeeeiiiiooooouuuunaaaaaeeeeiiiiooooouuuun'
  )
)
WHERE "searchName" IS NULL;

UPDATE "Product"
SET "searchName" = lower(
  translate(
    "name",
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑáàäâãéèëêíìïîóòöôõúùüûñ',
    'aaaaaeeeeiiiiooooouuuunaaaaaeeeeiiiiooooouuuun'
  )
)
WHERE "searchName" IS NULL;

-- Índices de búsqueda acelerada por cuenta
CREATE INDEX IF NOT EXISTS "Ingredient_accountId_searchName_idx" ON "Ingredient"("accountId", "searchName");
CREATE INDEX IF NOT EXISTS "Product_accountId_searchName_idx" ON "Product"("accountId", "searchName");
