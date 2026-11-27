-- Una sola presentación predeterminada por insumo (E7, #499).
--
-- 1) Corrige los datos antes de crear el índice: si un insumo quedó con más de una presentación
--    predeterminada (como pasó en la cuenta Demo de staging), deja una sola. Se queda la que da el
--    costo actual del insumo (precio del bulto dividido el tamaño, redondeado a 2 decimales, como
--    calculateUnitCost) y, si ninguna o varias lo dan, la de menor id. No cambia precios ni costos:
--    solo desmarca las demás. Sin este paso, el índice no se puede crear y `prisma migrate deploy`
--    falla con P3018, lo que traba los deploys siguientes.
WITH ordenadas AS (
  SELECT si."id",
         ROW_NUMBER() OVER (
           PARTITION BY si."ingredientId"
           ORDER BY COALESCE(ROUND(si."packagePrice" / NULLIF(si."packageSize", 0), 2) = i."currentCost", false) DESC,
                    si."id"
         ) AS orden
  FROM "SupplierIngredient" si
  JOIN "Ingredient" i ON i."id" = si."ingredientId"
  WHERE si."isDefault" = true
)
UPDATE "SupplierIngredient"
SET "isDefault" = false
WHERE "id" IN (SELECT "id" FROM ordenadas WHERE orden > 1);

-- 2) Garantiza como máximo una presentación predeterminada por insumo a nivel de base de datos.
CREATE UNIQUE INDEX "SupplierIngredient_ingredientId_default_key"
  ON "SupplierIngredient"("ingredientId")
  WHERE "isDefault" = true;
