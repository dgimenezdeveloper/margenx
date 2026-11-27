# E2E — Playwright + Global Auth Setup con Clerk

Issue #68 (Base #67 / #47B). Scaffolding para que las suites E2E arranquen autenticadas en local y en el pipeline de CI, sin pasar por el formulario visual de login en cada prueba.

---

## 1. Cómo Funciona la Autenticación Global

1. **Proyecto `setup` (`auth.setup.ts`):**  
   Corre siempre antes que cualquier suite (configurado en `playwright.config.ts`).
2. **Estrategia Oficial Server-Side (`emailAddress`):**  
   Utiliza `@clerk/testing/playwright` invocando `clerk.signIn({ page, emailAddress })`. Mediante `CLERK_SECRET_KEY`, Clerk genera un token firmado del lado del servidor que omite validaciones de contraseña, emails de confirmación y multi-factor authentication (MFA). Cuenta con un fallback a `strategy: 'password'` si se define `E2E_CLERK_TEST_PASSWORD`.
3. **Persistencia de Sesión (`storageState`):**  
   Una vez logueado en `/dashboard`, almacena cookies y localStorage en `frontend/playwright/.auth/user.json`.
4. **Herencia de Sesión:**  
   Los proyectos `chromium`, `firefox` y `webkit` declaran `dependencies: ['setup']` y cargan `storageState: authFile`. Todas las pruebas inician con la sesión activa de quien inicie sesión como `E2E_CLERK_TEST_EMAIL` (hoy, en CI, el administrador de Panadería Central — ver nota de migración a la cuenta Demo más abajo).
   **Excepción:** `home.spec.ts` prueba la landing del visitante y la abre **sin sesión** (`test.use({ storageState: { cookies: [], origins: [] } })`): con sesión, la app va directo al dashboard sin mostrar la landing. La versión con sesión de las pantallas públicas (`/`, `/instalar`, `/privacidad`) la cubre `public-pages-session.spec.ts`, que detecta con un `MutationObserver` si la landing llegó a pintarse antes del dashboard.
5. **Seguridad y Git:**  
   La carpeta `playwright/.auth/` y el archivo `.env.test` están estrictamente excluidos en `.gitignore`. Ninguna credencial ni cookie se versiona.

### 1.1. Segunda Sesión Global: Colaborador (issue #127)

`rbac-security.spec.ts` necesita auditar la app con permisos de `COLLABORATOR`, no de `ADMIN` — una sesión distinta a la que usa el resto de las suites. En vez de loguear/desloguear dentro del test (lento y frágil), sigue el mismo patrón de auth global pero en paralelo:

- **Proyecto `setup-collaborator` (`auth.collaborator.setup.ts`):** mismo mecanismo de `clerk.signIn({ page, emailAddress })`, pero con `E2E_CLERK_COLLAB_EMAIL` (cuenta de pruebas definida en los secrets de GitHub). Persiste su propio `storageState` en `playwright/.auth/collaborator.json` — nunca pisa `user.json`.
- **Proyecto `chromium-collaborator`:** el único que carga `collaborator.json` y el único que corre `rbac-security.spec.ts` (vía `testMatch`). Los proyectos `chromium`/`firefox`/`webkit` excluyen ese archivo explícitamente (`testIgnore`) para no correrlo dos veces con la sesión equivocada.
- Acotado a un solo browser (Chromium): alcanza para auditar ocultamiento de datos y no justifica triplicar el tiempo de CI.

### 1.2. Cuarentena de precios (issue #310)

`quarantine-queue.spec.ts` no mockea el escenario de cuarentena: lo dispara de verdad a través del mismo webhook de ingesta que usa producción (`POST /api/webhooks/supplier-prices`), con un precio cuya variación supera el 50% sobre un `supplierCode` real del seed. Para eso necesita `INTERNAL_WEBHOOK_SECRET` (ver más abajo) — es el único spec de la suite que llama directamente a la API en vez de solo interactuar con la UI.

Antes de cada caso lee el estado del insumo con `GET /api/ingredients/:id` y al terminar verifica que quedó exactamente igual: rechazar no modifica nada, y liberar se revierte con el alta de la presentación (`POST /api/suppliers/:id/ingredients`) más el `PUT /api/ingredients/:id` del costo vigente. Las capturas a 360px quedan en `frontend/test-results/evidencia-360px/` y el job de E2E del CI las publica siempre como artefacto `evidencia-360px`.

---

### 1.3. Impacto en el margen (issues #389 y #446)

`purchasing-suggestions.spec.ts` corre con la sesión de `ADMIN` y **crea sus propios datos por la API** (dos proveedores, un insumo con la presentación predeterminada a $1.000/kg y una alternativa a $800/kg, y un producto que usa 1 kg a $1.500 con mínimo del 40 %), con un sufijo único por corrida, y los borra al terminar aunque la prueba falle. No toca el catálogo del seed que usan `cascade-recalculation.spec.ts` y `margin-recalculation.spec.ts`. `TC-COMPRAS-01` recorre `/compras` a 360 px: la tarjeta del insumo con el margen del producto de 33,3 % (**En riesgo**) a 46,7 % (**En objetivo**), sin calculadora de bultos ni pedido, con la pestaña **Impacto** activa y sin scroll horizontal; confirma **Ya le compro a este proveedor** y verifica con `GET /api/products/:id` que el margen guardado es el que mostraba la confirmación. En escritorio comprueba el enlace **Impacto en el margen** en la barra superior. Las capturas quedan en `test-results/evidencia-360px/compras-impacto-*.png`. El acceso denegado al colaborador lo cubre `TC-RBAC-07` en `rbac-security.spec.ts`.

### 1.4. Accesibilidad con axe (issue #442)

`accessibility-axe.spec.ts` corre con la sesión de `ADMIN` (proyecto `chromium`) y es de solo lectura: abre la ficha de Pan flauta — 1 kg, `/productos/nuevo`, `/insumos`, la carga desde planilla y `/dashboard`, en claro y oscuro (el tema se guarda en `localStorage` antes de abrir la página) y a 360 px y 1280 px. En cada caso espera a que la pantalla cargue y a que terminen las transiciones, corre axe y falla si hay violaciones `serious` o `critical`. Deja un JSON y un resumen en Markdown por caso en `test-results/axe/`: el job de E2E del CI pasa los resúmenes al reporte del job y sube la carpeta como artefacto `axe-accesibilidad`. Cómo correrlo y cómo se excluye una regla: `frontend/README.md`, "Accesibilidad con axe".

### 1.5. Menú del celular con "Más" y arrastre (issue #437)

`mobile-layout-360px.spec.ts` suma dos casos con la sesión de `ADMIN`, a 360 px y con pantalla táctil (`hasTouch`). Son de solo lectura:

- **`TC-LAYOUT-03`:** el menú de abajo muestra Inicio, Productos, Insumos, Ventas y **Más**, sin rótulos cortados. **Más** abre el panel con las 7 pantallas, Inicio marcada como página actual. Escape lo cierra y devuelve el foco a **Más**. La captura queda en `test-results/evidencia-360px/menu-panel-360px.png`.
- **`TC-LAYOUT-04`:** arrastra el dedo de izquierda a derecha desde el medio de la pantalla y comprueba que el panel se abre. Cuando terminó de abrirse, lo arrastra hacia la izquierda y comprueba que se cierra. Playwright no trae un arrastre táctil, así que los toques se mandan con el protocolo de Chromium (`Input.dispatchTouchEvent`): el caso corre solo en los proyectos de Chromium, como en el CI.

`purchasing-suggestions.spec.ts` (`TC-COMPRAS-01`) verifica a 360 px que **Más** queda marcado en `/compras` y que, en el panel, **Impacto en el margen** es la página actual.

## 2. Requisitos Previos

### Variables de Entorno Locales (Obligatorio para correr en local)
Copiá la plantilla de pruebas a tu entorno local:
```bash
cp frontend/.env.test.example frontend/.env.test
```
`TC-RBAC-08` (issue #364) abre como colaborador `/insumos`, `/proveedores/cuarentena` y `/productos/nuevo`, comprueba que vuelve a `/productos` con el aviso "Esa pantalla es solo para el administrador" (`role="status"`) y que recargar el catálogo no lo repite.

Completá `E2E_CLERK_COLLAB_EMAIL` además de las variables ya existentes (ver `.env.test.example`) para poder correr `rbac-security.spec.ts`. Completá `INTERNAL_WEBHOOK_SECRET` con el mismo valor que tengas en `backend/.env` para poder correr `quarantine-queue.spec.ts`.

### Secret Nuevo en CI (issue #127)
Además de los secrets ya configurados (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_TEST_EMAIL`, `E2E_CLERK_TEST_PASSWORD`), GitHub Actions necesita `E2E_CLERK_COLLAB_EMAIL` (cuenta de pruebas definida en los secrets de GitHub) en *Settings → Secrets and variables → Actions* para que `chromium-collaborator` pueda correr.

`INTERNAL_WEBHOOK_SECRET` (issue #310) no necesitó un secret nuevo en GitHub: en el job de CI el backend y el Postgres son efímeros y nadie externo los alcanza, así que `.github/workflows/ci.yml` lo fija con un valor fijo en vez de pedirlo por secret.

### Migración pendiente a la cuenta Demo (issue #268)

`frontend/.env.test.example` ya recomienda para uso **local** las credenciales de
la cuenta "Demo MargenX" (`backend/prisma/seed-demo.ts`) en vez de las de
Panadería Central, para dejar de depender del comercio piloto real en algo
que cualquiera puede clonar y correr. Los 5 specs (`home`, `smoke`,
`cascade-recalculation`, `margin-recalculation`, `rbac-security`) **todavía
aseveran contra los datos de Panadería Central** (nombres de insumos,
productos, montos); `public-pages-session` no depende del catálogo. Esos 5
specs no se reescribieron en esta issue, porque requiere
acceso real a Clerk/CI para verificarlo de punta a punta sin romper el
pipeline en el intento.

**No cambiar los secrets `E2E_CLERK_TEST_EMAIL`/`E2E_CLERK_COLLAB_EMAIL` de
GitHub Actions a la cuenta Demo todavía** — el aislamiento multiempresa hace
que esa cuenta solo vea su propio catálogo (torta de chocolate, insumos con
sufijo "(demo)", etc.), así que cambiar el secret sin reescribir antes los
asserts de los 5 specs tira todo el E2E del CI abajo. Orden correcto para
quien tome esto:
1. Reescribir los 5 specs contra el catálogo de `seed-demo.ts`.
2. Correrlos en local contra la cuenta Demo real y confirmarlos en verde.
3. Recién ahí actualizar los secrets de GitHub Actions.
4. Agregar `npm run seed:demo` al paso de seed del job E2E en `ci.yml` (hoy
   solo corre `prisma db seed`, el de Panadería Central/Química GyJ).
