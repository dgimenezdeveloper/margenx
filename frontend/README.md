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
│   └── proveedores/          # Solo ADMIN — lista, alta, edición y baja de proveedores
│       └── cuarentena/       # Solo ADMIN — bandeja de precios en cuarentena
├── components/       # Compartidos entre rutas (navbar, toasts, diálogos, guards de ruta)
│   └── ui/           # Primitivas accesibles estilizadas (button, dialog, etc.)
├── hooks/            # useUserRole, useTheme, useSessionSecurity, useTokenGetter, etc.
├── lib/              # Clientes y utilidades de bajo nivel (Clerk, formato numérico)
├── schemas/          # Validación con Zod (productSchema, ingredientSchema, supplierPackagingSchema, supplierSchema)
├── services/         # Llamadas HTTP a la API, una por recurso
├── stores/           # Estado global con Zustand (useQuarantineStore, useRecipeStore, useUserStore)
└── routes.tsx        # Mapa de rutas (react-router-dom) — fuente de verdad de qué existe
```

### Formato de números (es-AR)

Todo número que se muestra pasa por `src/lib/format.ts`: `formatMoney` (`$7.000,51`; `{ decimals: 0 }` para pesos enteros), `formatPercent` (`36,9 %`, con espacio duro; `{ signed: true }` para variaciones como `+119,0 %`), `formatQuantity` / `formatQuantityWithUnit` (`0,7 kg`) y `formatUnit` (`u` y el valor heredado `unit` se leen como `unidad`, `l` como `litro`). No uses `toFixed` ni `toLocaleString` sueltos en la UI. La lectura de lo que escribe el usuario (`1.234,56` → `1234.56`) está en `src/lib/numericFormat.ts`.

La plantilla de "Cargar desde planilla" se arma con ExcelJS (`buildTemplateWorkbook` en `src/lib/bulkIngredients.ts`, cargado bajo demanda) porque SheetJS Community no escribe estilos; la lectura de planillas sigue con SheetJS (`src/lib/spreadsheet.ts`). `package.json` fija `uuid` en `^11.1.1` dentro de ExcelJS (`overrides`) por el aviso GHSA-w5hq-g745-h8pq.

`src/routes.tsx` es la referencia real de las rutas (algunas carpetas viejas bajo `app/productos/` que no aparecen ahí, como `detalle/`, son restos sin usar).

Guards de ruta (`src/components/protected-route.tsx`, `admin-only-route.tsx`) aplican el control de acceso en el cliente; el backend repite la misma regla en cada endpoint — ninguno de los dos alcanza solo.

### Estados de carga, vacío y error

Cada pantalla que pide datos distingue tres estados y nunca los mezcla (DoD §5):

- **Cargando:** skeleton o indicador de carga. También se muestra mientras se reintenta, en lugar del error anterior.
- **Vacío:** `src/components/empty-state.tsx`, solo cuando la API respondió bien y no hay datos.
- **Error:** `src/components/error-state.tsx` (`ErrorState`), cuando la API falla (5xx) o no hay red. Reemplaza a los indicadores: un fallo nunca se pinta como "0 productos en riesgo" ni como una lista vacía.

`ErrorState` recibe `title`, `description` y `onRetry` (botón **Reintentar**, alto mínimo de 44 px) y se anuncia con `role="alert"`. Opcionales: `retryLabel`, `icon`, `className` e `isRetrying` (deshabilita el botón y muestra "Reintentando..." en pantallas que mantienen el error visible durante el reintento). `onAction` y `actionLabel` son alias para mantener la misma interfaz que `EmptyState`.

Lo usan `/dashboard`, `/insumos`, `/proveedores` y `/proveedores/cuarentena`. En todas el mensaje es el de `ApiError` (lo arma la API en español); ante cualquier otro error, por ejemplo un fallo de red, se muestra un texto genérico de la pantalla y nunca el mensaje técnico del navegador.

### Diálogos (`Dialog`)

Toda ventana emergente (modal centrado o bottom sheet) se arma con `src/components/ui/dialog.tsx`, una capa de estilos sobre `@base-ui/react/dialog`. No se escriben modales a mano con `fixed inset-0`. El componente resuelve solo:

- **Foco atrapado:** al abrirse, el foco entra al diálogo y Tab / Shift+Tab circulan únicamente dentro de él. El resto de la página queda oculto para el lector de pantalla.
- **Cierre con Escape** y con clic en el fondo. Con dos diálogos apilados (por ejemplo, la ficha de un insumo y encima su historial de costos), Escape cierra solo el de arriba.
- **Devolución del foco** al elemento que lo abrió, sea un `DialogTrigger` o un botón común que cambia el estado.
- **Bloqueo del scroll del fondo** mientras está abierto. Lo hace el propio `Dialog` con `useBodyScrollLock` (el hook que corrige el arrastre del fondo en iOS Safari y lleva la cuenta de diálogos apilados); Base UI solo atrapa el foco (`modal="trap-focus"`) para no sumar un segundo bloqueo. En las pantallas no se llama a `useBodyScrollLock` por cada diálogo: queda para elementos que no son diálogos, como el desplegable de insumos de `/productos/nuevo`.

Piezas que exporta:

| Pieza | Uso |
|---|---|
| `Dialog` | Raíz. Controlado con `open` y `onOpenChange`, o no controlado con `DialogTrigger`. |
| `DialogTrigger` | Botón que lo abre (opcional). |
| `DialogPortal` + `DialogBackdrop` | Montaje fuera del árbol y fondo oscuro. |
| `DialogPopup` | Ventana centrada: confirmaciones (eliminar, cerrar sesión, cambios sin guardar). |
| `DialogSheet` | Bottom sheet en mobile y ventana centrada desde `md`: formularios (insumo, empaque, historial, simulador). |
| `DialogTitle` / `DialogDescription` | Nombre y descripción que anuncia el lector de pantalla. |
| `DialogClose` | Botón que lo cierra. |

Reglas para un diálogo nuevo:

1. Siempre `DialogTitle` y `DialogDescription`. Si la descripción no se muestra en pantalla, se deja con `className="sr-only"`.
2. Un botón solo con ícono (la X de cerrar) lleva `aria-label`.
3. Si cerrar tiene condiciones (está guardando, hay cambios sin guardar), se resuelven en `onOpenChange`, que recibe `false` tanto con Escape como con clic en el fondo o en `DialogClose`.
4. Para apilar un diálogo sobre otro, se sube el `z-index` de su `DialogBackdrop` y su `DialogPopup`/`DialogSheet` (por ejemplo, `z-70`; los toasts están en `z-100`).

```tsx
<Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDeleting) onClose() }}>
  <DialogPortal>
    <DialogBackdrop />
    <DialogPopup>
      <DialogTitle>¿Eliminar producto?</DialogTitle>
      <DialogDescription>Estás a punto de eliminar definitivamente Medialunas de manteca.</DialogDescription>
      <DialogClose>Cancelar</DialogClose>
      <button type="button" onClick={onConfirm}>Sí, eliminar</button>
    </DialogPopup>
  </DialogPortal>
</Dialog>
```

Pruebas: `src/components/ui/__tests__/dialog.test.tsx` (foco atrapado, Escape, clic en el fondo, devolución del foco, bloqueo de scroll, diálogos apilados) y `src/components/__tests__/dialogos-accesibles.test.tsx` (título, descripción y botones con nombre en cada diálogo de la app). La navegación con Tab se simula con `@testing-library/user-event`.

### Accesibilidad de Tablas y Formularios (WCAG 2.1 AA)

- **Navegación con Teclado en Tablas (`UX-06`):** Las filas interactivas de las tablas de datos (`SuppliesTableDesktop` y `ProductsPage`) implementan `tabIndex={0}`, `role="button"` y handlers accesibles para responder a `Enter` y `Espacio` (con `event.preventDefault()` en barra espaciadora para neutralizar el scroll nativo de ventana). Cuentan con anillos de foco visibles perimetrales en color índigo con la sintaxis canónica de Tailwind (`focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-600`).
- **Campos con Nombre Accesible (`UX-13`):** Todos los inputs de búsqueda de la aplicación incluyen `aria-label` explícito (`"Buscar insumos por nombre"` y `"Buscar productos por nombre"`). Los campos de formularios conectan sus etiquetas con `htmlFor` e `id` explícitos (ej. `id="ingredient-current-cost"` en `IngredientUpsertSheet`).
- **Mensajes de Validación y Foco (`UX-14` / Bug 1):** En formularios y modales (ej. `SupplierPackagingModal`), cada error detectado por Zod/React Hook Form se renderiza adyacente a su control con `id={`${field}-error`}`, `role="alert"` y atributos `aria-invalid` y `aria-describedby`. Al intentar guardar datos inválidos, el foco del cursor se desplaza automáticamente al primer campo observado sin romper el ciclo de renderizado.

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

### Service worker y página Sin conexión

El service worker se genera con `vite-plugin-pwa` desde `pwa.config.ts` y se registra solo en el build de producción (`npm run dev` y los E2E no lo usan). La estrategia completa está en `docs/Arquitectura-Software-(SAD).md` §4, "Estrategia de Caché del Frontend (PWA)". En corto: se precachean JS, CSS, íconos y `public/offline.html`; la API y el HTML de la app siempre van a la red; si una navegación falla por falta de red se muestra **Sin conexión** con el botón **Reintentar**; una versión nueva se avisa con **Actualizar** y no se aplica sola; al cerrar sesión, `clearSessionCaches()` (`src/lib/serviceWorkerCache.ts`) borra toda caché que no sea el precache.

`src/__tests__/service-worker.test.ts` valida las rutas excluidas (API y Clerk), que ninguna regla guarde respuestas, la página Sin conexión y las reglas de `nginx.conf` para `sw.js`, `offline.html` e `index.html`.

Para verificarlo a mano, con `npm run build && npm run preview` en `http://localhost:4173`:

1. **Registro:** DevTools → **Application** → **Service workers**: `sw.js` activo.
2. **Sin datos en caché:** iniciá sesión, recorré Productos y el Dashboard, y revisá **Application** → **Cache storage**: solo existe `workbox-precache-v2-...` y ninguna entrada empieza con `/api`.
3. **Sin conexión:** en **Network** elegí **Offline** y recargá `/dashboard`: tiene que verse "Sin conexión" con **Reintentar**. Volvé a **No throttling** y tocá **Reintentar**.
4. **Versión nueva:** con la app abierta, generá otro build (por ejemplo, cambiando un texto) y volvé a la pestaña: aparece el aviso; **Actualizar** recarga con la versión nueva.

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
