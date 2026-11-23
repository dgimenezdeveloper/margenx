# QA — Colección Postman/Newman: API de Ventas y caja

Colección `MargenX - Ventas API.postman_collection.json` y script `run-tests-ventas.sh`. Valida `/api/sales` y `/api/cash-shifts` (ADR-010, `docs/api.md` §12) recorriendo un día de caja: abre un turno, vende, anula y cierra con arqueo. Al final, la ganancia real de la semana.

## Qué cubre

- **Ventas:** 401 sin token; listado del ADMIN (`{ data, meta }`, 20 por página, `Cache-Control: private, no-store`); listado del colaborador sin `unitCost`, `lineCost`, `marginPercent` ni `totalCost`; fecha inválida (400) y válida; venta inexistente (404); cuerpo sin productos y medio de pago inválido (400); venta sin turno abierto (409).
- **Turno:** monto inicial inválido (400); apertura del colaborador con $10.000 (201); segundo turno (409); turno actual con lo esperado sin la venta anulada.
- **Venta, ticket y anulación:** venta del colaborador (201, sin costos); el ticket del ADMIN con costo y margen congelados; ventas filtradas por turno; anulación sin motivo (400), con motivo (200, `VOIDED`) y repetida (409).
- **Ganancia real:** resumen de la semana del ADMIN (contrato, ganancia = ventas − costo, incluye la venta válida y no la anulada, `Cache-Control: private, no-store`); período inválido (400); colaborador (403, sin montos).
- **Cierre:** sin lo contado de los tres medios (400); cierre del colaborador contando $500 menos (diferencia `-500.00`); cierre repetido (409); venta con el turno cerrado (409); anulación del ADMIN con el turno cerrado (403); historial de turnos; resumen con el nombre del comercio; turno inexistente (404).

## Qué datos deja

**Modifica datos.** Cada corrida deja en Panadería Central un turno cerrado, una venta y una venta anulada (una venta no se borra, se anula). Correrla **solo contra la base local**. Se puede repetir: el paso 12 cierra un turno que haya quedado abierto de una corrida anterior, y el resto no depende de lo que ya haya en la cuenta.

## 1. Prender el módulo para Panadería Central (base local)

El módulo está apagado por defecto: con el módulo apagado, todas las rutas responden 404. En la base **local** del devcontainer, desde `backend/`:

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
INSERT INTO "AccountFeature" ("id", "accountId", "feature", "enabled", "updatedAt")
SELECT gen_random_uuid(), "id", 'sales', true, now() FROM "Account" WHERE "slug" = 'panaderia-central'
ON CONFLICT ("accountId", "feature") DO UPDATE SET "enabled" = true, "updatedAt" = now();
SQL
```

Para apagarlo después, la misma sentencia con `false`. No correr esto contra staging ni producción: allí el módulo se maneja con `infra/scripts/seed-remoto.sh` (`docs/runbook-operacion.md`).

## 2. Generar los tokens y correr

Los tokens duran ~60 segundos. Desde `backend/`:

```bash
npx tsx scripts/get-test-token.ts panaderia-admin
npx tsx scripts/get-test-token.ts panaderia-colab
cd tests/postman && ./run-tests-ventas.sh "<token_admin>" "<token_colaborador>"
```

Salida esperada: **0 failures** (34 requests). Si el paso 03 da 404, el módulo está apagado para la cuenta (volver al paso 1). Si los pasos de `/api/cash-shifts` responden HTML en vez de JSON, el backend que está corriendo es de una versión anterior: reiniciarlo.
