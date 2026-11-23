# QA — Colección Postman/Newman: API de Ventas

Colección `MargenX - Ventas API.postman_collection.json` y script `run-tests-ventas.sh`. Valida `/api/sales` (ADR-010, `docs/api.md` §12): sesión, roles, respuesta sin costos para el colaborador, filtros, validaciones y la venta sin turno abierto.

## Qué cubre y qué no

- **Cubre:** 401 sin token; listado del ADMIN (`{ data, meta }`, 20 por página, `Cache-Control: private, no-store`); listado del colaborador sin `unitCost`, `lineCost`, `marginPercent` ni `totalCost`; fecha inválida (400) y válida; venta inexistente (404); cuerpo sin productos y medio de pago inválido (400); **venta sin turno de caja abierto (409)**; anulación sin motivo (400) y de una venta inexistente (404).
- **No modifica datos:** la cuenta de prueba no tiene un turno abierto, así que ninguna venta se registra. Se puede correr las veces que haga falta.
- **Todavía no cubre** la venta registrada, el ticket ni la anulación de una venta real: necesitan abrir un turno de caja (`POST /api/cash-shifts/open`), que llega con la issue de turnos y cierre de caja. Ese flujo se suma a esta colección en ese PR. Mientras tanto lo cubren las pruebas de Vitest (`backend/src/routes/salesRoutes.test.ts`).

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

Salida esperada: **0 failures**. Si el paso 03 da 404, el módulo está apagado para la cuenta (volver al paso 1).
