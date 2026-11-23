# QA — Colección Postman/Newman: API de Productos

Issue #38. Colección automatizada de pruebas de API para `POST/GET /api/products`: alta exitosa (con y sin receta), validaciones negativas y aislamiento multi-tenant entre dos cuentas.

## Archivos

- `MargenX - Productos API.postman_collection.json` — la colección (Postman Collection v2.1).
- `MargenX - Productos QA.postman_environment.json` — environment con variables de conexión. Se versiona con valores placeholder (sin secretos reales) — los tokens se pisan en tiempo de ejecución, ver más abajo.
- `run-tests-productos.sh` — wrapper de `newman run` con el `accountId` de Cuenta A precargado.

## ⚠️ Notas importantes: alcance vs. estado actual del backend

1. **Aislamiento probado por el listado.** La colección se armó cuando Productos solo tenía `GET /api/products` (listado) y `POST /api/products` (alta). Por eso la issue #38, que pide validar el aislamiento multi-tenant "consultando un `productId` ajeno", se cubrió con el único endpoint de lectura de entonces: se crea un producto con la Cuenta A y se verifica que **no aparece en el listado de la Cuenta B** (carpeta `02 - Aislamiento Multiempresa`). Hoy también existen `GET`, `PUT` y `DELETE /api/products/:id`: el caso directo (`GET /api/products/:id` ajeno → 404), como el de Insumos, queda como mejora.
2. **Limpieza automática (#312).** La carpeta `03 - Limpieza` borra con `DELETE /api/products/:id` los dos productos que crea la corrida ("Producto QA" y "Producto Precio Cero") y controla que ya no existan (`GET /api/products/:id` → 404). Los demás casos de alta son rechazos (400 o 409) y no crean nada.

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

El environment ya trae `ingredientId_cuentaA_harina` con el id de "Harina de trigo 000 Olavarriense" del seed de Panadería Central (`30b00001-0000-4000-8000-000000000001`): lo usa el caso `salePrice: 0` con receta (`400`). El caso de nombre duplicado reusa el nombre del primer producto creado, en mayúsculas, y espera `409 Conflict` (issue #242).

Salida esperada: **0 failures**, con el detalle de cada assertion (`pm.test`) en verde.

## 3. Reproducibilidad

- El nombre de cada producto de prueba incluye `{{$timestamp}}`, así que las corridas no colisionan entre sí por nombre duplicado.
- La carpeta `03 - Limpieza` borra los dos productos que crea la corrida y controla que ya no existan, así que la colección se puede correr seguida sin dejar productos en la base (#312). Si una corrida se corta antes de esa carpeta, los productos que hayan quedado se reconocen por el nombre (`"Producto QA …"` o `"Producto Precio Cero …"`) y se borran desde la app o con `DELETE /api/products/:id`.

## También desde la app de Postman (opcional, para debug manual)

1. Importá ambos archivos (`File → Import`).
2. Seleccioná el environment "MargenX - Productos QA" arriba a la derecha.
3. Editá a mano `accountId_cuentaA` (`30a00000-0000-4000-8000-000000000001`), `token_cuenta_A` y `token_cuenta_B` con los tokens del paso 1.
4. Corré la colección completa con el botón **Run** (Collection Runner), o request por request.
