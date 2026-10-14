ALTER TABLE "Account" ADD COLUMN "slug" TEXT;

UPDATE "Account"
SET "slug" = CASE
  WHEN "businessName" = 'Panadería Central' THEN 'panaderia-central'
  WHEN "businessName" = 'Química GyJ' THEN 'quimica-gyj'
  ELSE lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          trim("businessName"),
          '[áàäâÁÀÄÂ]',
          'a',
          'g'
        ),
        '[éèëêÉÈËÊ]',
        'e',
        'g'
      ),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  )
END
WHERE "slug" IS NULL;

-- Asegura unicidad y no nulos para el uso del webhook por slug.
CREATE UNIQUE INDEX "Account_slug_key"
ON "Account"("slug");

ALTER TABLE "Account"
ALTER COLUMN "slug" SET NOT NULL;
