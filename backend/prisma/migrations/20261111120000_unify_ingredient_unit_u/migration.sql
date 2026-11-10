-- Unificar 'unit' a 'u' en Ingredient y SupplierIngredient (issue SPRINT6-BE-01 / #350)
UPDATE "Ingredient"
SET "unit" = 'u'
WHERE "unit" = 'unit';

UPDATE "SupplierIngredient"
SET "packageUnit" = 'u'
WHERE "packageUnit" = 'unit';