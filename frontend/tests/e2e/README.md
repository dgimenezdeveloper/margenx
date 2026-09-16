# E2E — Playwright + Global Auth Setup con Clerk

Issue #67. Scaffolding para que las suites E2E del Sprint 2 arranquen ya autenticadas, sin pasar por el formulario visual de login en cada test.

## Cómo funciona

- **`auth.setup.ts`** corre como el proyecto `setup` de Playwright (ver `playwright.config.ts`), **siempre antes** que cualquier otra suite. Usa `@clerk/testing` para autenticar a un usuario real (ADMIN de Panadería Central) por `strategy: 'password'`, sin tocar la UI del formulario de `<SignIn>`, y guarda el estado de la sesión (cookies + local storage) en `playwright/.auth/user.json`.
- Los proyectos `chromium`/`firefox`/`webkit` declaran `dependencies: ['setup']` y `storageState: authFile`, así que **todas** las suites (incluida `home.spec.ts`) arrancan con esa sesión ya cargada.
- `playwright/.auth/` está en `.gitignore` — el archivo de sesión nunca se versiona, y como el proyecto `setup` corre en cada ejecución de `npx playwright test`, se regenera solo aunque no exista todavía.

## Requisitos previos

1. Backend y frontend corriendo localmente (`npm run dev` en ambas carpetas).
2. `frontend/.env` con `VITE_CLERK_PUBLISHABLE_KEY` configurado (ya lo tenés si corriste la app).
3. `frontend/.env.test` con las credenciales de Node/Playwright — copiá `frontend/.env.test.example`:
   ```bash
   cp .env.test.example .env.test
   ```
   y completá:
   - `CLERK_SECRET_KEY` — la misma clave que usa `backend/.env` (necesaria para que `@clerk/testing` obtenga el Testing Token de Clerk).
   - `E2E_CLERK_TEST_EMAIL` / `E2E_CLERK_TEST_PASSWORD` — credenciales reales de un usuario de Clerk con password configurada para la cuenta piloto Panadería Central. Pedirlas al equipo si no las tenés.

## Correr los tests

```bash
cd frontend
npx playwright test
```

Para correr solo el smoke test en Chromium:

```bash
npx playwright test tests/e2e/smoke.spec.ts --project=chromium
```

Salida esperada: el proyecto `setup` pasa primero (genera `playwright/.auth/user.json`), y después `smoke.spec.ts` accede directo a `/dashboard` sin pasar por `/login`.

## Notas

- `@clerk/testing`'s `clerk.signIn()` no soporta 2FA/multi-factor — si la cuenta de prueba tiene MFA activado, el setup va a fallar. Usá una cuenta sin MFA para E2E.
- Si `E2E_CLERK_TEST_EMAIL`/`E2E_CLERK_TEST_PASSWORD` faltan, `auth.setup.ts` corta con un mensaje explícito en vez de fallar de forma críptica más adelante.
