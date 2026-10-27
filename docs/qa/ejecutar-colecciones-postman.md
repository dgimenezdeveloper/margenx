# Cómo ejecutar las 6 colecciones de Postman

Issue #264. Las 6 colecciones viven en `backend/tests/postman/` y validan la API contra una base local sembrada (`npx prisma db seed` desde `backend/`, con el backend corriendo en `http://localhost:3000`).

Cada colección tiene su propio wrapper `run-tests*.sh` para no tener que armar el comando de `newman` a mano. Correlos desde `backend/tests/postman/`.

| Colección | Script | Qué necesita |
|---|---|---|
| Insumos API | `./run-tests.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Productos API | `./run-tests-productos.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Proveedores y Conversiones | `./run-tests-proveedores.sh <token_A> <token_B>` | Tokens de `panaderia-admin` y `quimica-admin` |
| Webhooks API | `INTERNAL_WEBHOOK_SECRET=<secreto> ./run-tests-webhooks.sh` | El mismo `INTERNAL_WEBHOOK_SECRET` del `.env` del backend |
| Colaborador RBAC API | `./run-tests-rbac-colaborador.sh <token_colaborador>` | Token de `panaderia-colab` |
| Alertas de margen (Insumos) | `./run-tests-alertas-margen.sh <token_admin> <token_colaborador>` | Tokens de `panaderia-admin` y `panaderia-colab` |

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

## Correr las 6 en orden

```bash
cd backend/tests/postman
./run-tests.sh "$TOKEN_A" "$TOKEN_B"
./run-tests-productos.sh "$TOKEN_A" "$TOKEN_B"
./run-tests-proveedores.sh "$TOKEN_A" "$TOKEN_B"
INTERNAL_WEBHOOK_SECRET=<el del .env del backend> ./run-tests-webhooks.sh
./run-tests-rbac-colaborador.sh "$TOKEN_COLLAB"
./run-tests-alertas-margen.sh "$TOKEN_A" "$TOKEN_COLLAB"
```

Salida esperada: **0 failures** en las 6.

## Reproducibilidad

- Insumos se autolimpia (borra el insumo de prueba al final).
- Productos **no** se autolimpia: no existe `DELETE /api/products/:id`. Los productos de prueba quedan persistidos (prefijo `"Producto QA"` / `"Producto Precio Cero"` / `"Producto Precio Negativo"`); borrarlos a mano desde Prisma Studio si hace falta una base piloto limpia.
- Alertas de margen deja el insumo "Harina de trigo 000 Olavarriense" en su costo del seed (`742.98`) al final de la propia colección — no hace falta limpieza aparte, y se puede correr repetidas veces sin pisar el baseline que también usan `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts` (E2E).
- Proveedores, Webhooks y Colaborador RBAC no modifican datos que haga falta restaurar.

## Para cada README específico

Insumos (`README.md`), Productos (`README-Productos.md`) y Proveedores (`README-ProveedoresConversiones.md`) tienen su propio README en esta misma carpeta con el detalle de alcance y preparación de cuentas. Webhooks, Colaborador RBAC y Alertas de margen no necesitan preparación adicional más allá de los tokens de la tabla de arriba.
