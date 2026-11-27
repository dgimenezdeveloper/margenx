-- Garantiza como máximo una presentación predeterminada por insumo a nivel de base de datos.
CREATE UNIQUE INDEX "SupplierIngredient_ingredientId_default_key"
  ON "SupplierIngredient"("ingredientId")
  WHERE "isDefault" = true;