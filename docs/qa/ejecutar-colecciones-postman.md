# Cómo ejecutar las 12 colecciones de Postman

Issue #264 (Colaboradores se sumó en #395, Compras en #388, Reportes en #390 y Ventas en #448). Las 12 colecciones viven en `backend/tests/postman/` y validan la API contra una base local sembrada (`npx prisma db seed` desde `backend/`, con el backend corriendo en `http://localhost:3000`).

Cada colección tiene su propio wrapper `run-tests*.sh` para no tener que armar el comando de `newman` a mano. Correlos desde `backend/tests/postman/`.

| Colección | Script | Qué necesita |
|---|---|---|
| Insumos API | `./run-tests.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Productos API | `./run-tests-productos.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Proveedores y Conversiones | `./run-tests-proveedores.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Webhooks API | `INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-webhooks.sh` | El mismo `INTERNAL_WEBHOOK_SECRET` del `.env` del backend |
| Colaborador RBAC API | `./run-tests-rbac-colaborador.sh <token_colaborador>` | Token de `panaderia-colab` |
| Alertas de margen (Insumos) | `./run-tests-alertas-margen.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab` |
| Cuarentena API | `INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-cuarentena.sh <token_A>` | Token de `panaderia-admin` y el mismo `INTERNAL_WEBHOOK_SECRET` del `.env` del backend |
| Dashboard API | `./run-tests-dashboard.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab` |
| Colaboradores API | `./run-tests-colaboradores.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab` (misma cuenta) |
| Compras API | `./run-tests-compras.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab` |
| Reportes API | `INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-reportes.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab`, y el mismo `INTERNAL_WEBHOOK_SECRET` del `.env` del backend |
| Ventas API | `./run-tests-ventas.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab`, con el módulo de ventas prendido para Panadería Central (`README-Ventas.md`) |

## Generar los tokens de Clerk

Los tokens duran ~60 segundos. Generarlos justo antes de correr la colección, desde `backend/`:

```bash
npx tsx scripts/get-test-token.ts panaderia-admin
npx tsx scripts/get-test-token.ts panaderia-colab
npx tsx scripts/get-test-token.ts quimica-admin
```

Para generar varios de una sola vez y no perder tiempo entre invocaciones (recomendado si vas a correr Insumos, Productos y Proveedores seguidas, que necesitan `panaderia-admin` y `quimica-admin`):

```bash
cd backend
echo "TOKEN_A=$(npx tsx scripts/get-test-token.ts panaderia-admin)"
echo "TOKEN_B=$(npx tsx scripts/get-test-token.ts quimica-admin)"
echo "TOKEN_COLLAB=$(npx tsx scripts/get-test-token.ts panaderia-colab)"
```

## Correr las 12 en orden

```bash
cd backend/tests/postman
./run-tests.sh "$TOKEN_A" "$TOKEN_B"
./run-tests-productos.sh "$TOKEN_A" "$TOKEN_B"
./run-tests-proveedores.sh "$TOKEN_A" "$TOKEN_B"
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-tests-webhooks.sh
./run-tests-rbac-colaborador.sh "$TOKEN_COLLAB"
./run-tests-alertas-margen.sh "$TOKEN_A" "$TOKEN_COLLAB"
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-tests-cuarentena.sh "$TOKEN_A"
./run-tests-dashboard.sh "$TOKEN_A" "$TOKEN_COLLAB"
./run-tests-colaboradores.sh "$TOKEN_A" "$TOKEN_COLLAB"
./run-tests-compras.sh "$TOKEN_A" "$TOKEN_COLLAB"
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-tests-reportes.sh "$TOKEN_A" "$TOKEN_COLLAB"
./run-tests-ventas.sh "$TOKEN_A" "$TOKEN_COLLAB"
```

Salida esperada: **0 failures** en las 12.

## Reproducibilidad

- Insumos se autolimpia (borra el insumo de prueba al final).
- Cuarentena se autolimpia: crea su propio insumo y dos proveedores, y los borra en la carpeta "04 - Cleanup Final".
- Productos se autolimpia: la carpeta "03 - Limpieza" borra los dos productos que crea ("Producto QA" y "Producto Precio Cero") con `DELETE /api/products/:id` y controla que ya no existan (#312).
- Alertas de margen deja el insumo "Harina de trigo 000 Olavarriense" como estaba antes de la corrida: el request 00 guarda su nombre, unidad y costo, el 04 los vuelve a poner y el 05 controla que queden iguales (#312). Si la base está recién sembrada, ese costo es `736.25` (ver `docs/qa/seed-data-comercios.md`); si otra colección lo cambió antes (por ejemplo, la de estrés), queda en ese valor y no en el del seed. No hace falta limpieza aparte, y se puede correr repetidas veces. `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts` (E2E) fijan su propio costo base (`742.98`) por `beforeEach` antes de cada test, así que no dependen de en qué quede este insumo al terminar la colección.
- Proveedores, Webhooks, Colaborador RBAC y Colaboradores no modifican datos que haga falta restaurar. Colaboradores no crea invitaciones reales (cada una manda un mail): el alta de punta a punta se prueba en staging, como explica `README-Colaboradores.md`.
- Compras API es una colección de solo lectura que no requiere restaurar datos ni resembrar la cuenta.
- Reportes API valida endpoints internos, permisos de ADMIN y el contrato del reporte. Para la prueba local, configurar el mismo `INTERNAL_WEBHOOK_SECRET` del backend.
- Ventas API no modifica datos: sin turno de caja abierto, la venta responde 409 y no se registra nada.

## Evidencia en los reportes de QA

Un reporte de QA cita la salida real de Newman o de Vitest, no solo capturas de pantalla: la tabla final de Newman (`requests`, `assertions`, fallas) o el resumen de Vitest, pegados como texto. Las reglas, incluida qué correos pueden aparecer, están en `docs/qa/evidencias/README.md`.

## Para cada README específico

Insumos (`README.md`), Productos (`README-Productos.md`), Proveedores (`README-ProveedoresConversiones.md`) Colaboradores (`README-Colaboradores.md`) y Ventas (`README-Ventas.md`) tienen su propio README en esta misma carpeta con el detalle de alcance y preparación de cuentas. Webhooks, Colaborador RBAC, Alertas de margen, Cuarentena, Dashboard, Compras y Reportes no necesitan preparación adicional más allá de los tokens o secretos de la tabla de arriba.
