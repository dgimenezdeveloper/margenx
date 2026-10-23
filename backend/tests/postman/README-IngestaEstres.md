# QA — Pruebas de Estrés y Resiliencia: Webhook de Ingesta (Issue #176)

Colección automatizada de estrés para `POST /api/webhooks/supplier-prices` (contrato de #200, mergeado en #208). No duplica la cobertura funcional de autorización/casos negativos — eso ya lo cubren `MargenX - Webhooks API.postman_collection.json` y `backend/src/routes/webhooks.test.ts`. Esta colección ejercita:

1. **El escenario Gherkin de la issue** — un lote de **3.000 filas** con **10 `supplierCode` reales** de Panadería Central (7 de Distribuidora MarJuanC + 3 de Don Roque) y **2.990 códigos basura** con caracteres especiales (`ART-9999...`, `TORNILLO-3MM...`, `LAVANDINA-XYZ...`, etc., igual que los ejemplos de la issue). Espera `200 OK`, `discarded: 2990`, respuesta bajo 1.5s, y además dos requests de borde (precio nulo, precio negativo) que deben rechazar el lote entero con `400`, nunca `500`.
2. **Volumen al tope del schema** — un lote de 5000 items (`z.array().max(5000)`) y uno de 5001 (debe dar 400).
3. **Ráfaga y concurrencia** — 3 lotes de 3000 items seguidos y 15 requests simultáneos contra el mismo endpoint.
4. **Casos límite por fila** — códigos duplicados, precios con muchos decimales, descripciones con unicode/HTML/emoji, códigos con espacios y payload con código vacío.

## ⚠️ Los 10 códigos reales de Panadería Central

La issue #176 pide 10 `supplierCode` reales, pero el seed de #178 solo había cargado 7 (todos de MarJuanC) — Don Roque no tenía ninguno porque todavía no tiene una lista de precios exportable. Para esta issue se backfillearon 3 códigos **internos de QA** en `backend/prisma/seed.ts` (`DR-LECHE01`, `DR-HUEVO01`, `DR-RICOTA01`) — no son un SKU publicado por Don Roque, son un identificador de referencia hasta que llegue su lista real. Ver el comentario en `seed.ts` y la nota en `docs/qa/seed-data-comercios.md`.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`) con la base de datos migrada y **re-seedeada** después de este cambio (`npx prisma migrate deploy && npx prisma db seed`, desde `backend/`) — necesario para que los 3 códigos de Don Roque existan.
2. `INTERNAL_WEBHOOK_SECRET` del `.env` del backend copiado al valor `internalWebhookSecret` del environment (o pasado por `--env-var` al correr Newman).
3. Newman y el reporter HTML instalados:
   ```bash
   npm install -g newman newman-reporter-htmlextra
   ```

## Ejecutar

Desde `backend/tests/postman/`:

```bash
./run-tests-ingesta-estres.sh
```

También acepta overrides de Newman al final, por ejemplo para pisar el secreto sin tocar el environment:

```bash
./run-tests-ingesta-estres.sh --env-var "internalWebhookSecret=<secreto real>"
```

Salida esperada: **0 failures**. El script guarda la evidencia de la corrida (exigida por el DoD de la issue) en `reports/`:

- `ingesta-estres-<timestamp>.cli.log` — salida CLI completa de Newman.
- `ingesta-estres-<timestamp>.html` — reporte HTML navegable (`newman-reporter-htmlextra`).

`reports/` está en `.gitignore` — son artefactos de evidencia por corrida, no se versionan; adjuntarlos al PR o a la entrega de la cátedra como evidencia.

## Lo que esta colección NO puede verificar (requiere la VPS real)

El alcance técnico de la issue pide monitorear `docker stats` en la VPS durante la corrida (consumo de RAM de Node.js < 350 MB, límite del contenedor de 512 MB). **Eso no se puede verificar desde una corrida local** — hace falta correr la colección apuntando a la VPS real y mirar `docker stats` en simultáneo:

```bash
# en la VPS, en otra terminal, mientras corre la colección
docker stats margenx-backend-dev --no-stream
```

Confirmar a mano que la columna `MEM USAGE` no supera ~350 MB durante la corrida, y que el contenedor no es matado por su límite de 512 MB (`docker events` o los logs de Docker mostrarían un OOM kill si pasara).

## Verificación de "cero excepciones no controladas" (DoD)

Además de que la colección en sí nunca debe recibir un `500`, correr el backend con los logs a un archivo durante la corrida y confirmar que no aparece ningún stack trace / `UnhandledPromiseRejection`:

```bash
# desde backend/, en otra terminal
npm run dev > /tmp/backend.log 2>&1 &
# ... correr la colección ...
grep -iE "unhandled|uncaught| at .*\.ts:" /tmp/backend.log || echo "sin excepciones no controladas"
```

## Verificación de "0 registros espurios insertados" (Alcance Técnico)

El endpoint nunca ejecuta un `create`, solo `update` sobre `SupplierIngredient`/`Ingredient` existentes (ver `backend/src/routes/webhooks.ts`) — no hay forma de que inserte filas nuevas. Como verificación adicional, antes/después de la corrida:

```bash
# desde backend/, con DATABASE_URL apuntando a la base usada en la corrida
npx prisma studio
# o por SQL: SELECT COUNT(*) FROM "SupplierIngredient"; SELECT COUNT(*) FROM "Ingredient";
```

El conteo debe ser idéntico antes y después.

## Reproducibilidad

- No crea insumos ni proveedores nuevos — solo actualiza `packagePrice`/`currentCost` de los 10 insumos reales vía el mismo endpoint que usa n8n en producción. Se puede correr repetidamente sin ensuciar el catálogo.
- Las aserciones sobre esos 10 códigos verifican `updated + unchanged + quarantined === 10` (no un bucket fijo), porque la colección es idempotente y el resultado exacto depende de si ya se corrió antes contra la misma base. Si se quiere arrancar de un estado conocido, re-seedear (`npx prisma db seed`) antes de correr.
- Los códigos de relleno (`ART-9999-*`, `TORNILLO-3MM-*`, etc.) son siempre inexistentes a propósito, para ejercitar el camino `NOT_FOUND` a volumen sin depender de más datos de proveedores reales.
