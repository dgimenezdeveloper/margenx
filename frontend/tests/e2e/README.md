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
   Los proyectos `chromium`, `firefox` y `webkit` declaran `dependencies: ['setup']` y cargan `storageState: authFile`. Todas las pruebas inician con la sesión activa del usuario administrador de Panadería Central.
5. **Seguridad y Git:**  
   La carpeta `playwright/.auth/` y el archivo `.env.test` están estrictamente excluidos en `.gitignore`. Ninguna credencial ni cookie se versiona.

---

## 2. Requisitos Previos

### Variables de Entorno Locales (Obligatorio para correr en local)
Copiá la plantilla de pruebas a tu entorno local:
```bash
cp frontend/.env.test.example frontend/.env.test
```