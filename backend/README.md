# MargenX — Backend

API REST con Express 5, TypeScript y Prisma sobre PostgreSQL 16. La consume el [frontend](../frontend) y autentica con Clerk. Para levantar el entorno completo (DevContainer o manual) seguí la "Guía de Inicio Rápido Local" del [README principal](../README.md); el contrato HTTP está en [`docs/api.md`](../docs/api.md).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga (`tsx watch`). Necesita `backend/.env` (plantilla en `.env.example`). |
| `npm run build` | Compila TypeScript estricto a `dist/`. Falla si hay errores de tipos. |
| `npm run start` | Sirve lo compilado en `dist/`. |
| `npm test` | Suite de Vitest: pruebas unitarias y la de integración, si hay base (ver abajo). |
| `npm run test:coverage` | Igual, con reporte de cobertura en `coverage/` (no se versiona). Umbral del 90 % de líneas en `vitest.config.mts`: si baja, el comando falla. Lo exige el CI. |

Los seeds de `prisma/` (`npx prisma db seed`, `npm run seed:demo`, `npm run seed:volumen`) no corren sin confirmar la base de destino con una variable propia: si falta, el script dice cuál es y qué valor espera. Qué carga cada uno y cómo se usan en la VPS: [`docs/runbook-operacion.md`](../docs/runbook-operacion.md).

## Pruebas

### Unitarias y cobertura

Las pruebas viven junto al código (`src/**/*.test.ts`) y no necesitan base: Prisma y los servicios externos se reemplazan con mocks o con objetos de prueba. La cobertura se mide sobre `src/**/*.ts`, sin `src/index.ts` ni `src/lib/prisma.ts` (`coverage.include` y `coverage.exclude` de `vitest.config.mts`).

### Integración con PostgreSQL

`prisma/seed-units.test.ts` aplica el SQL real de la migración `20261111120000_unify_ingredient_unit_u` sobre datos creados por la prueba, dentro de una transacción que se deshace al final: no deja datos en la base. La base se indica con `TEST_DATABASE_URL`:

- **En local, sin `TEST_DATABASE_URL`**, se omite (`npm test` informa "1 skipped").
- **En el CI** (`CI=true`) es obligatoria: si falta la variable, falla en vez de omitirse.

Para correrla en local, usá una base aparte con las migraciones aplicadas, nunca la de staging ni la de producción. En el DevContainer, por ejemplo, una base `margenx_test` en el mismo PostgreSQL:

```bash
# La primera vez crea la base; después, aplica las migraciones nuevas
DATABASE_URL="postgresql://postgres:<tu_password_local>@localhost:5432/margenx_test?schema=public" npx prisma migrate deploy

# Pruebas con la de integración incluida (0 omitidas)
TEST_DATABASE_URL="postgresql://postgres:<tu_password_local>@localhost:5432/margenx_test?schema=public" npm run test:coverage
```

### En el CI

El job `Backend Build & Tests` de `.github/workflows/ci.yml` levanta un PostgreSQL 16 efímero (la misma imagen que producción), compila, aplica todas las migraciones desde cero con `prisma migrate deploy` (falla si alguna no aplica sobre una base vacía) y corre `npm run test:coverage` con `TEST_DATABASE_URL`. El reporte de cobertura queda como artefacto `cobertura-backend` de la corrida (7 días), también cuando el umbral falla.

Las pruebas de la API contra el backend levantado (colecciones de Postman y Newman) están en [`tests/postman/`](tests/postman/).
