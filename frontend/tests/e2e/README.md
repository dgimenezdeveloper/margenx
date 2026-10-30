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
5. **Seguridad y Git:**  
   La carpeta `playwright/.auth/` y el archivo `.env.test` están estrictamente excluidos en `.gitignore`. Ninguna credencial ni cookie se versiona.

### 1.1. Segunda Sesión Global: Colaborador (issue #127)

`rbac-security.spec.ts` necesita auditar la app con permisos de `COLLABORATOR`, no de `ADMIN` — una sesión distinta a la que usa el resto de las suites. En vez de loguear/desloguear dentro del test (lento y frágil), sigue el mismo patrón de auth global pero en paralelo:

- **Proyecto `setup-collaborator` (`auth.collaborator.setup.ts`):** mismo mecanismo de `clerk.signIn({ page, emailAddress })`, pero con `E2E_CLERK_COLLAB_EMAIL` (cuenta de pruebas definida en los secrets de GitHub). Persiste su propio `storageState` en `playwright/.auth/collaborator.json` — nunca pisa `user.json`.
- **Proyecto `chromium-collaborator`:** el único que carga `collaborator.json` y el único que corre `rbac-security.spec.ts` (vía `testMatch`). Los proyectos `chromium`/`firefox`/`webkit` excluyen ese archivo explícitamente (`testIgnore`) para no correrlo dos veces con la sesión equivocada.
- Acotado a un solo browser (Chromium): alcanza para auditar ocultamiento de datos y no justifica triplicar el tiempo de CI.

---

## 2. Requisitos Previos

### Variables de Entorno Locales (Obligatorio para correr en local)
Copiá la plantilla de pruebas a tu entorno local:
```bash
cp frontend/.env.test.example frontend/.env.test
```
Completá `E2E_CLERK_COLLAB_EMAIL` además de las variables ya existentes (ver `.env.test.example`) para poder correr `rbac-security.spec.ts`.

### Secret Nuevo en CI (issue #127)
Además de los secrets ya configurados (`VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_TEST_EMAIL`, `E2E_CLERK_TEST_PASSWORD`), GitHub Actions necesita `E2E_CLERK_COLLAB_EMAIL` (cuenta de pruebas definida en los secrets de GitHub) en *Settings → Secrets and variables → Actions* para que `chromium-collaborator` pueda correr.

### Migración pendiente a la cuenta Demo (issue #268)

`frontend/.env.test.example` ya recomienda para uso **local** las credenciales de
la cuenta "Demo MargenX" (`backend/prisma/seed-demo.ts`) en vez de las de
Panadería Central, para dejar de depender del comercio piloto real en algo
que cualquiera puede clonar y correr. Los 5 specs (`home`, `smoke`,
`cascade-recalculation`, `margin-recalculation`, `rbac-security`) **todavía
aseveran contra los datos de Panadería Central** (nombres de insumos,
productos, montos) — no se reescribieron en esta issue, porque requiere
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
