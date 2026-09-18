# QA — Colección Postman/Newman: API de Productos

Issue #38. Colección automatizada de pruebas de API para `POST/GET /api/products`: alta exitosa (con y sin receta), validaciones negativas y aislamiento multi-tenant entre dos cuentas.

## Archivos

- `MargenX - Productos API.postman_collection.json` — la colección (Postman Collection v2.1).
- `MargenX - Productos QA.postman_environment.json` — environment con variables de conexión. Se versiona con valores placeholder (sin secretos reales) — los tokens se pisan en tiempo de ejecución, ver más abajo.
- `run-tests-productos.sh` — wrapper de `newman run` con el `accountId` de Cuenta A precargado.

## ⚠️ Notas importantes: alcance vs. estado actual del backend

1. **Sin `GET/PUT/DELETE /api/products/:id`.** El endpoint de Productos hoy solo expone `GET /api/products` (listado paginado) y `POST /api/products` (alta). La issue #38 pide validar el aislamiento multi-tenant "consultando un `productId` ajeno" — al no existir una ruta de detalle por id, esa prueba se adaptó para usar el único endpoint de lectura disponible: se crea un producto con la Cuenta A y se verifica que **no aparece en el listado de la Cuenta B** (carpeta `02 - Aislamiento Multiempresa`). Cubre el mismo riesgo de fuga de datos que un test de IDOR clásico, pero no reemplaza uno si en el futuro se agrega la ruta de detalle — cuando eso pase, conviene sumar el caso directo (`GET /api/products/:id` ajeno → 404) como se hizo con Insumos.
2. **Sin limpieza automática.** Como tampoco existe `DELETE /api/products/:id`, los productos que crea esta colección en cada corrida **quedan persistidos** en la base (a diferencia de la colección de Insumos, que sí puede autolimpiarse). Todos los nombres de prueba llevan el prefijo `"Producto ..."` + `{{$timestamp}}` para poder identificarlos y borrarlos a mano desde Prisma Studio si hace falta dejar la base limpia.

## Requisitos previos

1. Backend corriendo localmente (`npm run dev` en `backend/`), con la base de datos migrada y el seed corrido al menos una vez (`npx prisma db seed`, desde `backend/`) — la colección usa las cuentas piloto reales del seed:
   - **Cuenta A:** Panadería Central (`accountId = 30a00000-0000-4000-8000-000000000001`).
   - **Cuenta B:** Química GyJ.
2. Newman instalado: `npm install -g newman` (o usar `npx newman` sin instalar global).

No hace falta crear cuentas ni usuarios a mano: el seed ya deja ambas cuentas piloto con un usuario ADMIN vinculado a un User ID real de Clerk.

## 1. Generar los tokens (duran ~60s cada uno)

Desde `backend/`:

```bash
npx tsx scripts/get-test-token.ts panaderia-admin   # token de Cuenta A
npx tsx scripts/get-test-token.ts quimica-admin     # token de Cuenta B
```

Como duran poco, no los guardes en el archivo de environment — generalos justo antes de correr Newman y pasalos como argumentos.

## 2. Correr la colección con Newman

Desde `backend/tests/postman/`:

```bash
./run-tests-productos.sh "<token de panaderia-admin>" "<token de quimica-admin>"
```

Esto ejecuta:

```bash
newman run "MargenX - Productos API.postman_collection.json" \
  -e "MargenX - Productos QA.postman_environment.json" \
  --env-var "accountId_cuentaA=30a00000-0000-4000-8000-000000000001" \
  --env-var "token_cuenta_A=<token panaderia-admin>" \
  --env-var "token_cuenta_B=<token quimica-admin>"
```

Salida esperada: **0 failures**, con el detalle de cada assertion (`pm.test`) en verde.

## 3. Reproducibilidad

- El nombre de cada producto de prueba incluye `{{$timestamp}}`, así que las corridas no colisionan entre sí por nombre duplicado.
- Al no existir `DELETE /api/products/:id`, los productos creados en cada run **no se borran solos** (ver nota de alcance más arriba). Si necesitás dejar la base piloto limpia, borralos a mano desde Prisma Studio filtrando por nombre (`"Producto QA"`, `"Producto Precio Cero"`, `"Producto Precio Negativo"`).

## También desde la app de Postman (opcional, para debug manual)

1. Importá ambos archivos (`File → Import`).
2. Seleccioná el environment "MargenX - Productos QA" arriba a la derecha.
3. Editá a mano `accountId_cuentaA` (`30a00000-0000-4000-8000-000000000001`), `token_cuenta_A` y `token_cuenta_B` con los tokens del paso 1.
4. Corré la colección completa con el botón **Run** (Collection Runner), o request por request.
