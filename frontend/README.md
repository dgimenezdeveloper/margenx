# MargenX — Frontend

React 19 + TypeScript + Vite. Consume la API del [backend](../backend) y se autentica contra Clerk. Ver el [README principal](../README.md) para el modelo de datos completo y el panorama general del sistema.

## Cómo correr

```bash
npm install
cp .env.example .env
npm run dev
```

Necesita el backend corriendo (ver `backend/README.md` si existe, o la sección "Local Setup" del README principal) — por defecto en `http://localhost:3000`.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite con HMR. |
| `npm run build` | `tsc -b` (typecheck) + build de producción. Falla si hay errores de tipos. |
| `npm run lint` | ESLint sobre todo el proyecto. |
| `npm run preview` | Sirve el build de producción localmente. |
| `npm run test` | Suite unitaria (Vitest). |
| `npm run test:coverage` | Igual, con reporte de cobertura (`coverage/`, no se versiona). Umbral del 90% de líneas — lo exige el CI (`frontend/vitest.config.ts`). |
| `npm run test:e2e` | Suite E2E (Playwright). Ver [Pruebas E2E](#pruebas-e2e) abajo. |

## Variables de entorno

`.env.example` cubre lo que necesita `npm run dev`/`build` (`VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, y opcionalmente `VITE_INACTIVITY_TIMEOUT_MS`, en milisegundos — por defecto 30 minutos de inactividad antes de cerrar la sesión, ver `src/hooks/useSessionSecurity.ts`; no aplica en la app instalada, donde manda la duración de Clerk, ver `docs/adr/0006-sesion-persistente-pwa.md`). Copiarlo a `.env` o `.env.local`.

`.env.test.example` es aparte y solo lo necesita la suite E2E — ver [Pruebas E2E](#pruebas-e2e).

## Estructura

```
src/
├── app/              # Una carpeta por ruta (page.tsx + sus propios componentes)
│   ├── dashboard/
│   ├── instalar/             # Guía paso a paso de instalación PWA (Pública)
│   ├── insumos/              # Solo ADMIN (redirige a /productos si no)
│   ├── login/
│   ├── perfil/
│   ├── privacidad/           # Política de tratamiento de datos (Pública)
│   ├── productos/
│   │   ├── [id]/             # Ficha técnica + receta de un producto
│   │   └── nuevo/
│   └── proveedores/
│       └── cuarentena/       # Solo ADMIN — bandeja de precios en cuarentena
├── components/       # Compartidos entre rutas (navbar, toasts, diálogos, guards de ruta)
├── hooks/            # useUserRole, useTheme, useSessionSecurity, etc.
├── lib/              # Clientes y utilidades de bajo nivel (Clerk, formato numérico)
├── schemas/          # Validación con Zod (productSchema, ingredientSchema, supplierPackagingSchema)
├── services/         # Llamadas HTTP a la API, una por recurso
├── stores/           # Estado global con Zustand (useQuarantineStore, useRecipeStore, useUserStore)
└── routes.tsx        # Mapa de rutas (react-router-dom) — fuente de verdad de qué existe
```

`src/routes.tsx` es la referencia real de las rutas (algunas carpetas viejas bajo `app/productos/` que no aparecen ahí, como `detalle/`, son restos sin usar).

Guards de ruta (`src/components/protected-route.tsx`, `admin-only-route.tsx`) aplican el control de acceso en el cliente; el backend repite la misma regla en cada endpoint — ninguno de los dos alcanza solo.

### Estados de carga, vacío y error

Cada pantalla que pide datos distingue tres estados y nunca los mezcla (DoD §5):

- **Cargando:** skeleton o indicador de carga. También se muestra mientras se reintenta, en lugar del error anterior.
- **Vacío:** `src/components/empty-state.tsx`, solo cuando la API respondió bien y no hay datos.
- **Error:** `src/components/error-state.tsx` (`ErrorState`), cuando la API falla (5xx) o no hay red. Reemplaza a los indicadores: un fallo nunca se pinta como "0 productos en riesgo" ni como una lista vacía.

`ErrorState` recibe `title`, `description` y `onRetry` (botón **Reintentar**, alto mínimo de 44 px) y se anuncia con `role="alert"`. Opcionales: `retryLabel`, `icon`, `className` e `isRetrying` (deshabilita el botón y muestra "Reintentando..." en pantallas que mantienen el error visible durante el reintento). `onAction` y `actionLabel` son alias para mantener la misma interfaz que `EmptyState`.

Lo usan `/dashboard`, `/insumos` y `/proveedores/cuarentena`. En las tres el mensaje es el de `ApiError` (lo arma la API en español); ante cualquier otro error, por ejemplo un fallo de red, se muestra un texto genérico de la pantalla y nunca el mensaje técnico del navegador.

## Pruebas

### Unitarias (Vitest)

`*.test.ts(x)` junto al archivo que prueban, o en una carpeta `__tests__/` al lado. `npm run test` para correrlas una vez, `npm run test:coverage` para el reporte con el umbral del 90% que exige el CI.

### E2E (Playwright)

Specs en `frontend/tests/e2e/`. Documentación completa de cómo funciona la autenticación global y qué secrets hacen falta en `frontend/tests/e2e/README.md` — incluye una nota pendiente sobre migrar las credenciales de prueba a la cuenta Demo (issue #268).

Resumen rápido para correrlas en local:
```bash
cp .env.test.example .env.test   # completar las credenciales (pedirlas al equipo)
npx playwright install            # una sola vez, si falta algún navegador
npm run test:e2e
```
Necesita el backend y el frontend corriendo contra una base con el seed cargado (`npx prisma db seed` en `backend/`).

## Instalabilidad PWA

La aplicación está configurada como una Progressive Web App (PWA) instalable mediante `manifest.webmanifest`, íconos adaptativos (maskable) y meta-etiquetas optimizadas para Android e iOS Safari.

Para verificar su correcto funcionamiento e instalabilidad:

1. **Build de producción:** Ejecutá `npm run build && npm run preview` (las capacidades PWA completas se auditan sobre el build de producción, no en el servidor de desarrollo).
2. **Manifest e instalabilidad (DevTools):**
   - Abrí Chrome o Edge en `http://localhost:4173`.
   - Abrí las DevTools (`F12`) → pestaña **Application** → **Manifest**.
   - Confirmá que `manifest.webmanifest` carga con código 200 (sin requerir sesión previa de Clerk), que el nombre es "MargenX", el modo es `standalone` y los íconos de 192 px, 512 px y 512 px maskable se muestran sin advertencias. La casilla **Show only the minimum safe area for maskable icons** permite ver que el isotipo no queda recortado.
   - En la misma pantalla, la sección **Installability** no debe listar errores. Lighthouse ya no sirve para esto: desde la versión 12 (Chrome 126) no tiene categoría PWA.
3. **Tipo y caché en el entorno desplegado:** `curl -I https://dev.margenx.tech/manifest.webmanifest` debe responder `200`, `Content-Type: application/manifest+json` y `Cache-Control: no-cache` (lo define `nginx.conf`; el manifest no lleva hash y no puede usar la caché de un año de los assets de Vite).
4. **Verificación en dispositivo real:**
   - **Android (Chrome):** Al navegar a la URL del entorno, el menú de opciones (tres puntos) debe ofrecer **"Instalar aplicación"** o **"Agregar a pantalla de inicio"**. Al abrirla desde el acceso directo, debe lanzarse en ventana dedicada sin barra de direcciones URL del navegador.
   - **iOS (Safari):** Al tocar el botón **Compartir** y presionar **"Agregar a Inicio"**, el sistema debe precargar el título "MargenX" y el isotipo nítido proveniente de `apple-touch-icon.png` sobre fondo plano sin esquinas negras ni transparencias no deseadas.

`src/__tests__/pwa.test.ts` (Vitest) valida en cada `npm test` los campos obligatorios del manifest, que cada ícono mida lo que declara en `sizes`, que el maskable y el `apple-touch-icon` sean opacos, que `favicon.ico` sea un ICO real y la regla de `nginx.conf` del manifest.

### Regenerar los íconos

Los íconos salen de `public/logo-icon.png` (230×230, fondo transparente) con ImageMagick, desde `frontend/public/`:

```bash
convert logo-icon.png -trim +repage -filter Lanczos -resize x154 -background none -gravity center -extent 192x192 -strip PNG32:icon-192x192.png
convert logo-icon.png -trim +repage -filter Lanczos -resize x410 -background none -gravity center -extent 512x512 -strip PNG32:icon-512x512.png
convert logo-icon.png -trim +repage -filter Lanczos -resize x300 -background white -gravity center -extent 512x512 -alpha remove -alpha off -strip PNG24:icon-512x512-maskable.png
convert logo-icon.png -trim +repage -filter Lanczos -resize x140 -background white -gravity center -extent 180x180 -alpha remove -alpha off -strip PNG24:apple-touch-icon.png
convert logo-icon.png -trim +repage -background none -gravity center -extent 194x194 -define icon:auto-resize=48,32,16 favicon.ico
```

En el maskable, el isotipo ocupa 300 px de alto para quedar dentro del círculo de zona segura (radio del 40 %). El de 512 px se amplía desde 230 px: si el equipo consigue el isotipo en vector o en mayor resolución, conviene regenerarlos desde ese archivo.
