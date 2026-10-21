# QA — Pruebas de Estrés: Webhook de Ingesta

Colección automatizada de estrés para `POST /api/webhooks/supplier-prices` (contrato de #200, mergeado en #208). No duplica la cobertura funcional de autorización/casos negativos — eso ya lo cubren `MargenX - Webhooks API.postman_collection.json` y `backend/src/routes/webhooks.test.ts`. Esta colección ejercita:

1. **Volumen** — un lote en el tope exacto del schema (5000 items, `z.array().max(5000)`) y uno que lo excede (5001), contra datos reales del seed (los 7 `supplierCode` de Distribuidora MarJuanC en Panadería Central).
2. **Ráfaga y concurrencia** — 3 lotes grandes seguidos y 15 requests simultáneos contra el mismo endpoint, para confirmar que no hay errores por conexiones/transacciones concurrentes sobre las mismas filas.
3. **Casos límite por fila** — códigos duplicados dentro de un mismo lote, precios con muchos decimales, descripciones con unicode/HTML/emoji, códigos con espacios (confirma el `.trim()` del schema) y payloads inválidos (precio no positivo, código vacío) que deben devolver `400` controlado, nunca `500`.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`) con la base de datos migrada y seedeada (`npx prisma migrate deploy && npx prisma db seed`, desde `backend/`).
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

## Verificación de "cero excepciones no controladas" (DoD)

Además de que la colección en sí nunca debe recibir un `500`, correr el backend con los logs a un archivo durante la corrida y confirmar que no aparece ningún stack trace / `UnhandledPromiseRejection`:

```bash
# desde backend/, en otra terminal
npm run dev > /tmp/backend.log 2>&1 &
# ... correr la colección ...
grep -iE "unhandled|uncaught| at .*\.ts:" /tmp/backend.log || echo "sin excepciones no controladas"
```

## Reproducibilidad

- No crea insumos ni proveedores nuevos — solo actualiza `packagePrice`/`currentCost` de los 7 insumos reales de MarJuanC vía el mismo endpoint que usa n8n en producción. Se puede correr repetidamente sin ensuciar el catálogo.
- Las aserciones sobre esos 7 códigos verifican `updated + unchanged + quarantined === 7` (no un bucket fijo), precisamente porque la colección es idempotente y el resultado exacto depende de si ya se corrió antes contra la misma base. Si se quiere arrancar de un estado conocido, re-seedear (`npx prisma db seed`) antes de correr.
- Los códigos de relleno (`ESTRES-*`) son siempre inexistentes a propósito, para ejercitar el camino `NOT_FOUND` a volumen sin depender de más datos de proveedores reales.
