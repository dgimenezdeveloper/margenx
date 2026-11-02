-- Auditoría previa a la migración 20261030224224_case_insensitive_unique_names (issue #242).
-- Solo lectura. Lista los nombres que chocan por cuenta sin distinguir mayúsculas;
-- si devuelve filas, `prisma migrate deploy` va a fallar al crear los índices únicos.
-- Hay que renombrar o borrar los registros listados desde la app antes de desplegar.
--
-- Uso en la VPS (ver docs/runbook-operacion.md §8):
--   docker exec -i margenx_postgres_prod sh -c 'psql -U "$POSTGRES_USER" -d margenx_prod -v ON_ERROR_STOP=1' \
--     < backend/prisma/sql/auditar-nombres-duplicados.sql

SELECT 'Supplier' AS tabla, a.slug AS cuenta, lower(t."name") AS nombre, count(*) AS repeticiones,
       string_agg(t."name", ' | ' ORDER BY t."name") AS variantes
FROM "Supplier" t JOIN "Account" a ON a.id = t."accountId"
GROUP BY a.slug, lower(t."name") HAVING count(*) > 1
UNION ALL
SELECT 'Ingredient', a.slug, lower(t."name"), count(*), string_agg(t."name", ' | ' ORDER BY t."name")
FROM "Ingredient" t JOIN "Account" a ON a.id = t."accountId"
GROUP BY a.slug, lower(t."name") HAVING count(*) > 1
UNION ALL
SELECT 'Product', a.slug, lower(t."name"), count(*), string_agg(t."name", ' | ' ORDER BY t."name")
FROM "Product" t JOIN "Account" a ON a.id = t."accountId"
GROUP BY a.slug, lower(t."name") HAVING count(*) > 1
ORDER BY 1, 2, 3;
