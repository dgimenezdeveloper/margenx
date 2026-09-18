# E2E — Playwright + Global Auth Setup con Clerk

Issue #68 (Base #67 / #47B). Scaffolding para que las suites E2E arranquen autenticadas en local y en el pipeline de CI, sin pasar por el formulario visual de login en cada prueba.

---

## 1. Cómo Funciona la Autenticación Global

1. **Proyecto `setup` (`auth.setup.ts`):**  
   Corre siempre antes que cualquier suite (configurado en `playwright.config.ts`).
2. **Estrategia Oficial Server-Side (`emailAddress`):**  
   Utiliza `@clerk/testing/playwright` invocando `clerk.signIn({ page, emailAddress })`. Mediante `CLERK_SECRET_KEY`, Clerk genera un token firmado del lado del servidor que omite validaciones de contraseña, emails de confirmación y multi-factor authentication (MFA). Cuenta con un fallback automático a `strategy: 'password'` en caso de entornos con acceso restringido a la Backend API.
3. **Persistencia de Sesión (`storageState`):**  
   Una vez logueado en `/dashboard`, almacena cookies y localStorage en `frontend/playwright/.auth/user.json`.
4. **Herencia de Sesión:**  
   Los proyectos `chromium`, `firefox` y `webkit` declaran `dependencies: ['setup']` y cargan `storageState: authFile`. Todas las pruebas inician con la sesión activa del usuario administrador de Panadería Central (`admin.panaderia@hotmail.com`).
5. **Seguridad y Git:**  
   La carpeta `playwright/.auth/` está excluida en `.gitignore`. Como el job `setup` se ejecuta al inicio de cada corrida, el archivo de sesión se regenera de forma autónoma tanto en local como en GitHub Actions.

---

## 2. Requisitos Previos

### Variables de Entorno Locales
Copiá la plantilla de pruebas a tu entorno local:
```bash
cp frontend/.env.test.example frontend/.env.test