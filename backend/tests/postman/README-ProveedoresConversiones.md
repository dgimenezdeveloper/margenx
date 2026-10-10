# QA — Colección Postman/Newman: Proveedores y Conversiones de Empaque

Issue #128 (SPRINT3-QA-03 / #85). Colección automatizada de pruebas de integración para `POST/GET /api/suppliers` y `POST /api/suppliers/:id/ingredients`: alta de proveedor, cálculo exacto del costo unitario a partir de un empaque mayorista (`packagePrice / packageSize`), redondeo `ROUND_HALF_UP` al cambiar el proveedor predeterminado, inserción en `PriceHistory`, validaciones negativas de la fórmula y aislamiento multi-tenant entre dos cuentas.

## Archivos

- `MargenX - Proveedores y Conversiones.postman_collection.json` — la colección (Postman Collection v2.1).
- `MargenX - Proveedores y Conversiones QA.postman_environment.json` — environment con variables de conexión. Se versiona con valores placeholder (sin secretos reales) — los tokens se pisan en tiempo de ejecución, ver más abajo.
- `run-tests-proveedores.sh` — wrapper de `newman run` con los `accountId` de ambas cuentas precargados.

## Qué certifica cada carpeta

| Carpeta | Caso de prueba (alcance técnico de la issue) |
| --- | --- |
| `01 - Setup` | Creación de proveedor válida (201) — dos proveedores de Cuenta A + el insumo base. |
| `02 - Asociación y Cálculo Exacto` | Escenario Gherkin de la issue: empaque de 20 litros a $15.000 ⇒ `currentCost` exactamente $750,00. Asociación de insumo con cálculo exacto de costo unitario. |
| `03 - Precisión Aritmética` | Caso de borde de redondeo: 40 litros a $67 ⇒ división exacta 1,675, que `ROUND_HALF_UP` debe redondear a **1,68** (no 1,67, que delataría un redondeo bancario/half-even incorrecto). Ejercita el mismo cambio de proveedor predeterminado para encadenar un segundo `PriceHistory`. |
| `04 - Validaciones Negativas` | `packageSize = 0` y `packagePrice` negativo devuelven 400 sin crear la asociación. |
| `05 - Aislamiento Multi-Tenant` | Cuenta A no puede listar el proveedor de Cuenta B (`GET /suppliers`) ni asociar un insumo propio a un proveedor ajeno (`POST /suppliers/:id/ingredients` ajeno ⇒ 404, nunca 403 ni 200/201). |
| `06 - Limpieza` | Borra proveedores e insumo de prueba de ambas cuentas (el insumo cascada su `PriceHistory` y cualquier `SupplierIngredient` remanente). |

## ⚠️ Nota importante: alcance vs. automatización en CI

Los tokens de Clerk que usa esta colección duran ~60 segundos (ver paso 1 más abajo), igual que en las colecciones de Insumos y Productos. Hoy **no hay un paso de CI en GitHub Actions que corra Newman** contra ninguna de las tres colecciones existentes en esta carpeta — son herramientas de QA manual/local, ejecutadas por una persona justo después de generar los tokens. Este PR sigue ese mismo patrón: agrega `run-tests-proveedores.sh` como el script de ejecución de esta colección (análogo a `run-tests.sh` / `run-tests-productos.sh`), pero no introduce un workflow de CI nuevo para Newman, porque ninguna de las colecciones hermanas lo tiene todavía.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`), con la base de datos migrada y el seed corrido al menos una vez (`npx prisma db seed`, desde `backend/`) — la colección usa las cuentas piloto reales del seed:
   - **Cuenta A:** Panadería Central (`accountId = 30a00000-0000-4000-8000-000000000001`).
   - **Cuenta B:** Química GyJ (`accountId = 30a00000-0000-4000-8000-000000000002`).
2. Newman instalado: `npm install -g newman` (o usar `npx newman` sin instalar global).

No hace falta crear cuentas, usuarios ni proveedores a mano: el seed ya deja ambas cuentas piloto con un usuario ADMIN vinculado a un User ID real de Clerk, y la colección crea y limpia sus propios insumos/proveedores de prueba en cada corrida.

## 1. Generar los tokens (duran ~60s cada uno)

Desde `backend/`:

```bash
npx tsx scripts/get-test-token.ts panaderia-admin   # token de Cuenta A
npx tsx scripts/get-test-token.ts quimica-admin     # token de Cuenta B
```

Como duran poco, no los guardes en el archivo de environment — generalos justo antes de correr Newman y pasalos como argumentos. Los endpoints de `/api/suppliers` requieren rol `ADMIN` para cualquier método (incluido `GET`), por eso ambos tokens deben ser de usuarios ADMIN, no COLLABORATOR.

## 2. Correr la colección con Newman

Desde `backend/tests/postman/`:

```bash
./run-tests-proveedores.sh "<token de panaderia-admin>" "<token de quimica-admin>"
```

Esto ejecuta:

```bash
newman run "MargenX - Proveedores y Conversiones.postman_collection.json" \
  -e "MargenX - Proveedores y Conversiones QA.postman_environment.json" \
  --env-var "accountId_cuentaA=30a00000-0000-4000-8000-000000000001" \
  --env-var "accountId_cuentaB=30a00000-0000-4000-8000-000000000002" \
  --env-var "token_cuenta_A=<token panaderia-admin>" \
  --env-var "token_cuenta_B=<token quimica-admin>"
```

Salida esperada: **0 failures** (0 assertions fallidas), con el detalle de cada assertion (`pm.test`) en verde — tal como lo exige el criterio de aceptación Gherkin de la issue.

### Staging

Para correr contra Staging en vez de local, overridear `baseUrl` (y usar tokens válidos de esa instancia de Clerk):

```bash
npx newman run "MargenX - Proveedores y Conversiones.postman_collection.json" \
  -e "MargenX - Proveedores y Conversiones QA.postman_environment.json" \
  --env-var "baseUrl=https://<host-de-staging>/api" \
  --env-var "accountId_cuentaA=30a00000-0000-4000-8000-000000000001" \
  --env-var "accountId_cuentaB=30a00000-0000-4000-8000-000000000002" \
  --env-var "token_cuenta_A=<token>" \
  --env-var "token_cuenta_B=<token>"
```

## 3. Reproducibilidad

- El nombre del insumo y de cada proveedor de prueba incluye `{{$timestamp}}`, así que las corridas no colisionan entre sí por nombre duplicado.
- La carpeta **"06 - Limpieza"** borra los 3 proveedores de prueba y el insumo de prueba al final del run (el borrado del insumo cascada su `PriceHistory` y cualquier `SupplierIngredient` remanente), para que la base quede como estaba y la colección se pueda correr repetidamente sin acumular datos de prueba.
- Si un run se corta a mitad de camino (ej. por token vencido) y algún registro de prueba queda huérfano, borralo a mano desde Prisma Studio antes del próximo run (filtrando por nombre: `"Aceite de Girasol QA"`, `"Distribuidora Mayorista QA"`, `"Distribuidora Industrial QA"`, `"Proveedor Ajeno QA"`).

## También desde la app de Postman (opcional, para debug manual)

1. Importá ambos archivos (`File → Import`).
2. Seleccioná el environment "MargenX - Proveedores y Conversiones QA" arriba a la derecha.
3. Editá a mano `token_cuenta_A` y `token_cuenta_B` con los tokens del paso 1 (`accountId_cuentaA`/`accountId_cuentaB` ya vienen precargados con las cuentas piloto del seed).
4. Corré la colección completa con el botón **Run** (Collection Runner), o request por request.
