# QA — Pruebas de Estrés y Resiliencia: Webhook de Ingesta (Issue #176)

Colección automatizada de estrés para `POST /api/webhooks/supplier-prices` (contrato de #200, mergeado en #208). No duplica la cobertura funcional de autorización/casos negativos — eso ya lo cubren `MargenX - Webhooks API.postman_collection.json` y `backend/src/routes/webhooks.test.ts`. Esta colección ejercita:

1. **El escenario Gherkin de la issue** — un lote de **3.000 filas** con **10 `supplierCode` reales** de Panadería Central (7 de Distribuidora MarJuanC + 3 de Don Roque) y **2.990 códigos basura** con caracteres especiales (`ART-9999...`, `TORNILLO-3MM...`, `LAVANDINA-XYZ...`, etc., igual que los ejemplos de la issue). Espera `200 OK`, `discarded: 2990`, respuesta bajo 1.5s, y además dos requests de borde (precio nulo, precio negativo) que deben rechazar el lote entero con `400`, nunca `500`.
2. **Volumen al tope del schema** — un lote de 5000 items (`z.array().max(5000)`) y uno de 5001 (debe dar 400).
3. **Ráfaga y concurrencia** — 3 lotes de 3000 items seguidos y 15 requests simultáneos contra el mismo endpoint, que tienen que terminar en menos de 7,5 s.
4. **Casos límite por fila** — códigos duplicados, precios con muchos decimales, descripciones con unicode/HTML/emoji, códigos con espacios y payload con código vacío. Después de los casos de muchos decimales y de código con espacios, la colección lee Harina 000 con `GET /api/ingredients/:id` y verifica el costo que quedó, no solo que la fila no se descartó (ver [Valores y tiempos que verifica](#valores-y-tiempos-que-verifica-313)).

## ⚠️ Los 10 códigos reales de Panadería Central

La issue #176 pide 10 `supplierCode` reales, pero el seed de #178 solo había cargado 7 (todos de MarJuanC) — Don Roque no tenía ninguno porque todavía no tiene una lista de precios exportable. Para esta issue se backfillearon 3 códigos **internos de QA** en `backend/prisma/seed.ts` (`DR-LECHE01`, `DR-HUEVO01`, `DR-RICOTA01`) — no son un SKU publicado por Don Roque, son un identificador de referencia hasta que llegue su lista real. Ver el comentario en `seed.ts` y la nota en `docs/qa/seed-data-comercios.md`.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`) con la base de datos migrada y **re-seedeada** después de este cambio (`npx prisma migrate deploy && npx prisma db seed`, desde `backend/`) — necesario para que los 3 códigos de Don Roque existan.
2. `INTERNAL_WEBHOOK_SECRET` del `.env` del backend copiado al valor `internalWebhookSecret` del environment (o pasado por `--env-var` al correr Newman).
3. Newman y el reporter HTML instalados:
   ```bash
   npm install -g newman newman-reporter-htmlextra
   ```
4. Un token de Clerk del ADMIN de Panadería Central (`panaderia-admin`), para leer el costo de Harina 000. Dura ~60 segundos: generarlo justo antes de correr, desde `backend/`:
   ```bash
   npx tsx scripts/get-test-token.ts panaderia-admin
   ```
   Los dos requests que lo usan corren después de la ráfaga y la concurrencia. Si la corrida tarda más de un minuto en llegar ahí, el token vence: esos dos requests dan `401` (el nombre de la prueba lo indica) y el resto de la colección sigue.
   El token tiene que salir de la misma instancia de Clerk que valida el backend contra el que se corre: `get-test-token.ts` usa el `CLERK_SECRET_KEY` del `.env` de `backend/` y los IDs de usuario de esa instancia. Para correr contra la VPS (por ejemplo, para medir `docker stats`), generarlo con la clave de la instancia de ese entorno; con un token de otra instancia, esos dos requests también dan `401`.

## Ejecutar

Desde `backend/tests/postman/`, con el token como primer argumento:

```bash
./run-tests-ingesta-estres.sh <token_panaderia_admin>
```

Sin token, el script avisa y no corre. Después del token acepta overrides de Newman, por ejemplo para pisar el secreto sin tocar el environment:

```bash
./run-tests-ingesta-estres.sh <token_panaderia_admin> --env-var "internalWebhookSecret=<secreto real>"
```

Para tomar el secreto y el token sin mostrarlos en pantalla, desde `backend/` y seguido, porque el token dura ~60 s:

```bash
SECRET=$(node -e "require('dotenv').config({ quiet: true });process.stdout.write(process.env.INTERNAL_WEBHOOK_SECRET || '')")
TOKEN=$(npx tsx scripts/get-test-token.ts panaderia-admin | grep -E '^eyJ')
cd tests/postman && ./run-tests-ingesta-estres.sh "$TOKEN" --env-var "internalWebhookSecret=$SECRET"
```

`quiet: true` hace falta: sin esa opción, `dotenv` 17 escribe en la salida un aviso ("injected env…") que queda pegado al secreto, y Newman rechaza la cabecera con `Invalid character in header content`.

Salida esperada: **0 failures**. El script guarda la evidencia de la corrida (exigida por el DoD de la issue) en `reports/`:

- `ingesta-estres-<timestamp>.cli.log` — salida CLI completa de Newman.
- `ingesta-estres-<timestamp>.html` — reporte HTML navegable (`newman-reporter-htmlextra`).

`reports/` está en `.gitignore` — son artefactos de evidencia por corrida, no se versionan; adjuntarlos al PR o a la entrega de la cátedra como evidencia.

## Valores y tiempos que verifica (#313)

| Caso | Qué envía | Qué verifica |
|---|---|---|
| Precio con muchos decimales | `HAR188` a `18406.387654` | `updated: 1`. Después, con `GET /api/ingredients/:id`, Harina 000 queda en `736.26` por kg: `18406.387654 / 25 = 736,25550616`, redondeado a 2 decimales con `ROUND_HALF_UP` (`calculateUnitCost`). Truncado daría `736.25`. El bulto HAR188 queda en `18406.39`, porque la columna guarda 2 decimales |
| Código con espacios | `"   HAR188   "` a `18500.00` | `updated: 1`. Después, la presentación HAR188 de Harina 000 queda en `18500` y el insumo, en `740.00` por kg (`18500 / 25`) |
| Concurrencia | 15 requests a la vez, de 300 filas cada uno, con los 10 códigos reales | Las 15 terminan en menos de **7,5 s** |

- **Por qué cambió el precio de muchos decimales:** antes era `18406.256789`. Redondeado o truncado daba `736.25`, el mismo costo del seed, así que no detectaba un redondeo incorrecto ni un precio que no se aplicó.
- **Por qué 7,5 s:** la revisión de #215 midió hasta 4,5 s, porque las 15 transacciones actualizan las mismas 10 filas y se atienden de a una. 7,5 s es cinco veces el 1,5 s del lote de 3.000 filas, y queda lejos del timeout de 30 s de la transacción (`webhooks.ts`) y de los 60 s que n8n espera la respuesta (`ingesta-listas.json`). Es un criterio de QA, no un requisito de la especificación: si en la VPS se mide otro valor, se ajusta acá y en `CONCURRENCY_MAX_MS` de la colección.
- **Insumo leído:** el environment trae `harina000IngredientId` con el id de "Harina de trigo 000 Olavarriense" del seed (`30b00001-0000-4000-8000-000000000001`), el insumo de la presentación `HAR188` (bulto de 25 kg).

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
- Los casos de muchos decimales y de código con espacios fijan precios conocidos y comparan contra el valor esperado, así que no dependen del estado previo. Corren en ese orden: el primero deja el bulto en `18406.39`, y por eso el segundo siempre es un cambio (`updated: 1`). Las dos variaciones quedan por debajo del 50 % y no entran en cuarentena.
- Los códigos de relleno (`ART-9999-*`, `TORNILLO-3MM-*`, etc.) son siempre inexistentes a propósito, para ejercitar el camino `NOT_FOUND` a volumen sin depender de más datos de proveedores reales.
