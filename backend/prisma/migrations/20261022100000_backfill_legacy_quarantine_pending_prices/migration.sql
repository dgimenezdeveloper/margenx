-- Backfill legacy rows that were already quarantined before pendingPackagePrice existed.
-- These rows should keep their current packagePrice as the proposed value, so they can be
-- released without being orphaned after deploy.
UPDATE "SupplierIngredient"
SET "pendingPackagePrice" = "packagePrice"
WHERE "isQuarantined" = true
  AND "pendingPackagePrice" IS NULL;
