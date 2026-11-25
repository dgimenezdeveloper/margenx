# Cómo ejecutar las 12 colecciones de Postman

Issue #264 (Colaboradores se sumó en #395, Compras en #388, Reportes en #390 y Ventas en #448, con la caja en #449). Las 12 colecciones viven en `backend/tests/postman/` y validan la API contra una base local sembrada (`npx prisma db seed` desde `backend/`, con el backend corriendo en `http://localhost:3000`).

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

Todos los `run-tests*.sh` aceptan opciones de Newman después de sus argumentos, por ejemplo `./run-tests-compras.sh "$TOKEN_A" "$TOKEN_COLLAB" --reporters cli,junit --reporter-junit-export compras.xml`.

## Regresión: las 13 de una vez

`run-regresion.sh` (#399) corre las 12 de arriba y, al final, la de estrés de ingesta (`README-IngestaEstres.md`), que cambia precios del seed. Pide un token nuevo de Clerk para cada colección, así que no hace falta generarlos antes:

```bash
cd backend/tests/postman
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-regresion.sh <carpeta de evidencia>
```

- **Qué deja en la carpeta, por colección:** la salida de consola (`NN-newman-<colección>.txt`, con fecha, commit, versiones y comando en el encabezado) y el reporte JUnit (`NN-newman-<colección>.xml`).
- **El resumen:** `00-resumen.md`, con una tabla para pegar en el reporte.
- **Limpieza:** tapa los tokens y el secreto del webhook con `[TOKEN]` y `[SECRETO]`, y saca los códigos de color.
- **Si algo falla:** sigue con las demás y sale con 1 si alguna falló o no se pudo correr.
- **Repetir solo algunas:** con `SOLO="03 11"`. El resumen de esa corrida queda en `00-resumen-parcial.md`.

Para la regresión final, la carpeta es `../../../docs/qa/evidencias/399`. Antes de subirla, revisá que no tenga correos fuera de los permitidos (`docs/qa/evidencias/README.md`).

## Antes de la regresión final: usuarios de Química GyJ en Clerk

Insumos, Productos y Proveedores prueban el aislamiento entre cuentas con un token de `quimica-admin` (Cuenta B). Esos usuarios todavía no existen en la instancia de Clerk de QA, y sin ellos la carpeta de aislamiento (la "02" en Insumos y Productos, la "05" en Proveedores) da 401 ([Sprint 7 §2.4](reporte-calidad-sprint7.md#24-lo-no-cubierto)). Los pasos:

1. **Crear los usuarios (Scrum Master o Tech Lead, con acceso al panel de Clerk).** En la instancia de QA, la de la `CLERK_SECRET_KEY` de `backend/.env`, crear dos usuarios con los correos ficticios del seed: `admin.quimica@seed.example.test` y `colab.quimica@seed.example.test`.
2. **Anotar sus IDs en el repositorio.** Clerk asigna el ID (`user_…`) y no se puede elegir. Reemplazar los de `quimica-admin` y `quimica-colab`:
   - en `backend/prisma/seed.ts`, cuenta Química GyJ;
   - en `USERS` de `backend/scripts/get-test-token.ts`.

   El backend busca al usuario por ese ID (`backend/src/middlewares/auth.ts`). En producción no cambia nada: el seed no pisa el ID de un usuario que ya existe.
3. **Actualizar la base local.** Por esa misma regla, una base ya sembrada conserva los IDs viejos. Hay dos caminos:
   - crearla de nuevo y volver a sembrarla;
   - actualizar esos dos usuarios solo en la base local.
4. **Comprobar.** `npx tsx scripts/get-test-token.ts quimica-admin` (desde `backend/`) devuelve un token, y la carpeta "02" de Insumos pasa.

## Reproducibilidad

- Insumos se autolimpia (borra el insumo de prueba al final).
- Cuarentena se autolimpia: crea su propio insumo y dos proveedores, y los borra en la carpeta "04 - Cleanup Final".
- Productos se autolimpia: la carpeta "03 - Limpieza" borra los dos productos que crea ("Producto QA" y "Producto Precio Cero") con `DELETE /api/products/:id` y controla que ya no existan (#312).
- Alertas de margen deja el insumo "Harina de trigo 000 Olavarriense" como estaba antes de la corrida: el request 00 guarda su nombre, unidad y costo, el 04 los vuelve a poner y el 05 controla que queden iguales (#312). Como la Harina tiene presentación predeterminada (HAR188), 01 y 04 mandan `"defaultPresentationAction": "update-presentation"` (ADR-011): el bulto pasa a 9500/kg en 01 y vuelve a dar el costo de antes en 04, y el 05 también controla que la presentación siga siendo la predeterminada y que su bulto dé ese costo (#427). Si la base está recién sembrada, ese costo es `736.25` (ver `docs/qa/seed-data-comercios.md`); si otra colección lo cambió antes (por ejemplo, la de estrés), queda en ese valor y no en el del seed. No hace falta limpieza aparte, y se puede correr repetidas veces. `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts` (E2E) fijan su propio costo base (`736.25`, el del seed) antes de cada test, así que no dependen de en qué quede este insumo al terminar la colección.
- Proveedores, Webhooks, Colaborador RBAC y Colaboradores no modifican datos que haga falta restaurar. Colaboradores no crea invitaciones reales (cada una manda un mail): el alta de punta a punta se prueba en staging, como explica `README-Colaboradores.md`.
- Compras API es una colección de solo lectura que no requiere restaurar datos ni resembrar la cuenta.
- Reportes API valida endpoints internos, permisos de ADMIN y el contrato del reporte. Para la prueba local, configurar el mismo `INTERNAL_WEBHOOK_SECRET` del backend.
- Ventas API **modifica datos**: cada corrida deja en Panadería Central un turno cerrado, una venta y una venta anulada. Correrla solo contra la base local; se puede repetir (`README-Ventas.md`).

## Evidencia en los reportes de QA

Un reporte de QA cita la salida real de Newman o de Vitest, no solo capturas de pantalla: la tabla final de Newman (`requests`, `assertions`, fallas) o el resumen de Vitest, pegados como texto. Las reglas, incluida qué correos pueden aparecer, están en `docs/qa/evidencias/README.md`.

## Para cada README específico

Insumos (`README.md`), Productos (`README-Productos.md`), Proveedores (`README-ProveedoresConversiones.md`) Colaboradores (`README-Colaboradores.md`) y Ventas (`README-Ventas.md`) tienen su propio README en esta misma carpeta con el detalle de alcance y preparación de cuentas. Webhooks, Colaborador RBAC, Alertas de margen, Cuarentena, Dashboard, Compras y Reportes no necesitan preparación adicional más allá de los tokens o secretos de la tabla de arriba.
