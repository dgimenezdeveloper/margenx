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
- **Error:** `src/components/error-state.tsx` (`ErrorState`), cuando la API falla (5xx) o no hay red. Reemplaza a los indicadores: un fallo nunca se pinta como "0 productos debajo de su mínimo" ni como una lista vacía.

`ErrorState` recibe `title`, `description` y `onRetry` (botón **Reintentar**, alto mínimo de 44 px) y se anuncia con `role="alert"`. Opcionales: `retryLabel`, `icon`, `className` e `isRetrying` (deshabilita el botón y muestra "Reintentando..." en pantallas que mantienen el error visible durante el reintento). `onAction` y `actionLabel` son alias para mantener la misma interfaz que `EmptyState`.

Lo usan `/dashboard`, `/insumos`, `/proveedores` y `/proveedores/cuarentena`. En todas el mensaje es el de `ApiError` (lo arma la API en español); ante cualquier otro error, por ejemplo un fallo de red, se muestra un texto genérico de la pantalla y nunca el mensaje técnico del navegador.

### Avisos (`ToastAlert` y `useToast`)

Los avisos flotantes de una pantalla se arman con `src/hooks/useToast.ts`, que devuelve `toast`, `notify(título, tipo, descripción)` y `dismiss`, y se muestran con `src/components/ToastAlert.tsx`:

- **Duración por tipo** (`TOAST_DURATION_MS` en `src/lib/toast.ts`): éxito e información 4 s; error y advertencia 8 s, porque hay que leerlos y a veces actuar. No se escriben temporizadores sueltos en las pantallas.
- **Un aviso nuevo cancela el temporizador del anterior**, así un aviso viejo nunca acorta al siguiente.
- **Siempre se pueden cerrar** antes de tiempo: se pasa `onClose={dismiss}` y `ToastAlert` muestra la X ("Cerrar notificación") y permite deslizarlo en el celular.
- **Lector de pantalla:** error y advertencia se anuncian con `role="alert"`; éxito e información, con `role="status"` (`aria-live="polite"`).

`/insumos` encola varios avisos seguidos (por ejemplo, el guardado y las recetas afectadas) y usa la misma `TOAST_DURATION_MS` para cada uno.

**Colaborador redirigido.** `AdminOnlyRoute` devuelve al `COLLABORATOR` a `/productos` con el estado `{ adminOnlyFrom: <ruta> }` (`src/lib/adminOnlyRedirect.ts`). El catálogo muestra el aviso "Esa pantalla es solo para el administrador" y limpia ese estado del historial para que recargar no lo repita.

### Cambios sin guardar

`src/hooks/useUnsavedChangesWarning.ts` recibe `true` mientras haya cambios sin guardar y:

1. Registra `beforeunload`: al cerrar o recargar la pestaña, el navegador pide confirmación.
2. Usa `useBlocker` de React Router: navegar dentro de la app (enlaces, barra inferior, botón o gesto "atrás") queda en espera y la pantalla muestra `UnsavedChangesDialog` con **Seguir editando** y **Descartar**.

Lo usan la ficha y el alta de producto, la ficha de insumo abierta en `/insumos` y el diálogo de alta y edición de proveedor. Cerrar el propio panel o diálogo con cambios también pide descartarlos, con el mismo `UnsavedChangesDialog`.

`useBlocker` solo funciona dentro de un router de datos (`createBrowserRouter` en la app). En las pruebas, las pantallas que usan el hook se montan con `renderWithDataRouter` (`src/test-utils/renderWithDataRouter.tsx`) o con `createMemoryRouter`, no con `MemoryRouter`.

### Paginación y búsqueda de listados

Los listados largos (`/insumos`, `/productos` y las presentaciones de `/proveedores/:id`) piden una página por vez a la API (`page`, `limit` y `search`; contrato en `docs/api.md`) y nunca filtran en memoria:

- `src/services/pagination.ts`: tipos `PageMeta`, `PageParams` y `PageResult`, tamaños `PAGE_SIZE_OPTIONS` (20, 50, 100) y `fetchAllPages`, que recorre todas las páginas de a 100 para los usos que necesitan el catálogo completo (`ingredientService.getAll`, `productService.getAll`, detección de duplicados de la planilla y contadores de la ficha del proveedor). Los servicios exponen `ingredientService.list`, `productService.list` y `supplierService.getPage`.
- `src/hooks/usePaginatedList.ts`: estado de página, filas por página, búsqueda con espera de 300 ms (`SEARCH_DEBOUNCE_MS`) y "Cargar más". Devuelve `meta` (con `meta.total` para los contadores), `catalogTotal` (total sin búsqueda, para tarjetas como "Insumos activos"), `appliedSearch` y `setItems` para actualizar la página visible tras editar.
- `src/components/pagination.tsx` (`Pagination`): en escritorio, `nav` con "Mostrando 21–40 de 218 insumos", selector "Filas por página" y botones "Página anterior"/"Página siguiente" de 44 px con `aria-label`; en mobile, "Cargar más" en lugar del paginador. No se muestra si no hay resultados.
- `src/hooks/useIngredientSearch.ts`: búsqueda en la API para el selector de insumos de la receta (`/productos/nuevo` y el modal de `/productos/:id`), con la misma espera de 300 ms y hasta 100 resultados.
- **Excepción: el panel (`/dashboard`).** Los números del panel (tarjetas, histograma y margen promedio) salen de `GET /api/dashboard/metrics`, que cuenta los cinco buckets sobre todo el catálogo en el servidor. La grilla "Catálogo Monitoreado" sí filtra en memoria, porque `GET /api/products` no filtra por bucket: recibe el catálogo completo con `productService.getAll` y lo muestra de a 20 con `Pagination` ("Cargar más" en mobile). Al tocar una columna del histograma, la grilla usa `classifyHealthBucket` (`src/lib/healthBucket.ts`), la misma regla que el servidor, para mostrar los mismos productos que cuenta la columna.

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
5. **Estructura con scroll interno y acciones fijas (`DialogSheet`):** Para evitar desbordes en dispositivos móviles (360 px), `DialogSheet` cuenta con `flex flex-col max-h-[90dvh]`. El encabezado y la botonera inferior deben configurarse con `shrink-0` (fijos), mientras que el contenedor central de formulario/contenido debe llevar `flex-1 overflow-y-auto pr-2 custom-scrollbar` (scroll interno). Si el diálogo utiliza un formulario intermedio `<form>`, este debe incluir `className="flex flex-col flex-1 overflow-hidden"` para que el flexbox mantenga los límites y habilite el scroll interno sin desbordar la ventana. En listas internas extensas (ej. proveedores vinculados a un insumo), aplicar además un límite de altura propio (`max-h-60 overflow-y-auto`).

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

### Menú del celular (`BottomNav` y `MobileMenu`)

Debajo de 768 px la navegación es el menú de abajo (`src/components/bottom-nav.tsx`). Desde 768 px no se muestra y manda la barra de arriba (`navbar.tsx`).

- **Pestañas:** `splitMobileNav` (`src/lib/navigation.ts`) ordena los destinos visibles del rol (`isNavLinkVisible`) y deja hasta 4 como pestañas. Con más, como el ADMIN, quedan 4 fijas y **Más**: Inicio, Productos, Insumos y Ventas, o Proveedores sin el módulo de ventas. A 360 px, 5 lugares entran con el rótulo completo (#437). **Más** se marca cuando la pantalla actual está en el panel.
- **Panel** (`src/components/mobile-menu.tsx`): se desliza de izquierda a derecha con todos los destinos del rol agrupados, la pantalla actual con `aria-current="page"`, **Modo oscuro** (`role="switch"`) y **Salir**, que pide confirmar con `LogoutDialog` y cierra la sesión con `useSignOut`.
  - Es la excepción a la regla de "Diálogos": usa el `Drawer` de Base UI, que extiende `Dialog` con el arrastre para cerrar.
  - Sigue las mismas convenciones: `modal="trap-focus"`, `useBodyScrollLock`, `Drawer.Title` y `Drawer.Description`, y la X con `aria-label`.
- **Arrastre para abrir** (`src/hooks/useSwipeToOpen.ts`):
  - Arranca desde cualquier punto de la pantalla y no solo desde el borde, porque en Android con navegación por gestos y en Safari del iPhone arrastrar desde el borde izquierdo es "Atrás".
  - Mientras el dedo sigue apoyado, el panel lo acompaña (`--menu-drag-x` y `--menu-drag-progress`). Al soltar, queda abierto si recorrió el 35 % del panel o más (`OPEN_DISTANCE_RATIO`) o si el dedo salió rápido (0,5 px/ms o más).
  - Solo toma arrastres horizontales hacia la derecha: el scroll vertical sigue andando.
  - No arranca en campos de texto, en otros diálogos, en zonas con scroll horizontal ni dentro de `[data-swipe-ignore]`.
  - Escucha en `window`, en fase de captura, porque el `Drawer` corta la propagación de `touchmove` en `document`. También escucha en el elemento donde se apoyó el dedo, porque si ese elemento se vuelve a dibujar mientras el dedo sigue apoyado, el navegador le manda los toques a él, ya fuera del DOM.
  - Con el panel abierto, el arrastre hacia la izquierda lo resuelve el `Drawer`.
- **Botón con alternativa:** **Más** es la forma de abrir el panel sin gesto (WCAG 2.5.1), y el colaborador, que no tiene **Más**, igual llega a todas sus pantallas desde el menú de abajo.

Pruebas: `src/components/__tests__/menu-movil.test.tsx` (pestañas por rol y módulo, panel, Escape y foco, modo oscuro, Salir y el arrastre con toques simulados), `src/lib/__tests__/navigation.test.ts` (`splitMobileNav`) y, en la E2E, `TC-LAYOUT-03` y `TC-LAYOUT-04` de `mobile-layout-360px.spec.ts`.

### Accesibilidad de Tablas y Formularios (WCAG 2.1 AA)

- **Navegación con Teclado en Tablas (`UX-06`):** Las filas interactivas de las tablas de datos (`SuppliesTableDesktop` y `ProductsPage`) implementan `tabIndex={0}`, `role="button"` y handlers accesibles para responder a `Enter` y `Espacio` (con `event.preventDefault()` en barra espaciadora para neutralizar el scroll nativo de ventana). Cuentan con anillos de foco visibles perimetrales en color índigo con la sintaxis canónica de Tailwind (`focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-600`).
- **Campos con Nombre Accesible (`UX-13` / `#361`):** Todos los inputs de búsqueda incluyen `aria-label` explícito (`"Buscar insumos por nombre"` y `"Buscar productos por nombre"`). Todos los formularios asocian obligatoriamente sus etiquetas mediante `<label htmlFor="...">` con `id` explícitos en los inputs, garantizando que la propiedad `input.labels` nunca quede vacía y los lectores de pantalla anuncien el campo. En la ficha de producto (`ProductMasterDataForm` y `/productos/nuevo`) se asocian `product-name`, `product-sale-price` y `product-min-margin`.
- **Anillo de Foco Canónico y Uniformidad en Modales (`#361`):** Los controles interactivos, pestañas y botones del modal de carga por planilla (`BulkIngredientsModal`), la ficha y el alta de producto y el simulador de precio consumen la constante centralizada `CANONICAL_FOCUS_CLASSES` (`src/lib/accessibility.ts`): contorno visible de 2 px con separación exterior (`outline-offset-2`), color `indigo-600` (claro) / `indigo-400` (oscuro) con contraste $\ge 3:1$ y sin anillos superpuestos (`focus-visible:ring-0`). La constante no lleva `focus:outline-none`: en Tailwind 4 esa clase deja el contorno invisible al tabular, y una prueba (`src/lib/__tests__/accessibility.test.ts`) lo impide.
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

### Accesibilidad con axe (Playwright)

`tests/e2e/accessibility-axe.spec.ts` (#442) corre axe con `@axe-core/playwright` dentro de la suite E2E, con la sesión de ADMIN, sobre:

- la ficha del producto (Pan flauta — 1 kg, del seed);
- `/productos/nuevo`;
- `/insumos`;
- la carga desde planilla;
- `/dashboard`.

Cada pantalla se revisa en claro y en oscuro, a 360 px y en escritorio (1280 px): 20 pruebas.

```bash
npx playwright test tests/e2e/accessibility-axe.spec.ts --project=chromium
```

Necesita lo mismo que el resto de la E2E: backend, seed y `.env.test`.

- **Qué corta:** una violación `serious` o `critical`. Las `moderate` y `minor` no cortan: se informan.
- **Reporte:** por pantalla, tema y ancho, un JSON y un resumen en Markdown en `test-results/axe/` (ignorado en git). El resumen también lista las reglas que axe no pudo decidir solo, para revisarlas a mano. En el CI, los resúmenes van al reporte del job de E2E (pestaña *Summary* de la corrida) y la carpeta se sube siempre como artefacto `axe-accesibilidad`.
- **Exclusiones:** solo para una violación que no se puede corregir a tiempo. Van en `EXCLUDED_RULES` de la spec, con la regla y el motivo; la regla sigue corriendo y en el reporte figura como excluida. Cada exclusión se anota también en `docs/qa/reporte-calidad-sprint7.md` §5. Hoy no hay ninguna.
- **Límite con Lighthouse (#398):** LHCI mide los puntajes de las páginas públicas. axe revisa en cada PR las pantallas con sesión y encontró violaciones que Lighthouse no marcaba, sobre todo en oscuro y en escritorio.
- **Pantalla nueva:** se suma a `SCREENS` de la spec, con lo que hay que esperar para que esté cargada.

### Lighthouse (LHCI, a 360 px)

`lighthouserc.json` audita las páginas públicas (`/`, `/login`, `/instalar` y `/privacidad`) sobre el build servido con `vite preview`: celular de 360 × 640 px, 4G lenta simulada y la mediana de tres corridas (#398). Las metas (90 o más en Performance, Accessibility, Best Practices y SEO) van como advertencia: no cortan el comando ni el CI.

```bash
npm run build
npx --yes @lhci/cli@0.16.1 autorun   # el reporte queda en lhci-report/ (ignorado en git)
```

- En el CI corre el job **Lighthouse CI (360 px, no bloquea)**, que no es un check requerido, y sube el reporte como artefacto `lighthouse-360px`. Se decide bloquear cuando la medición sea estable.
- `@lhci/cli` se usa con `npx` y la versión fija, sin agregarlo a `package.json`: sus dependencias suman vulnerabilidades moderadas de desarrollo que no hacen falta en el lockfile.
- Con la clave de la instancia de desarrollo de Clerk, Best Practices queda en 77: Clerk deja una cookie de terceros (`_cfuvid`, de `accounts.dev`). En producción Clerk usa `clerk.margenx.tech`, de primera parte, y ese punto no se pierde. Resultados y desvíos: `docs/qa/reporte-calidad-sprint7.md` §3.
- Las páginas con sesión no entran en LHCI (necesitan Clerk y la API). Se miden a mano con Chrome (DevTools → **Lighthouse** → *Mobile*), con la sesión iniciada, o con el procedimiento del reporte de calidad.

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

### Zona segura de iOS (app instalada)

`index.html` declara `viewport-fit=cover`. Con eso, en el iPhone `env(safe-area-inset-bottom)` vale la franja de la línea de inicio, y en horizontal `env(safe-area-inset-left)` y `env(safe-area-inset-right)` valen la franja de la muesca. Sin la directiva, iOS devuelve 0 y en la app instalada la línea de inicio queda sobre la `BottomNav`. En Android y en escritorio valen 0.

Reglas para lo que se fija en pantalla:

1. **Lo fijo abajo suma la zona segura a su relleno inferior.** La `BottomNav` usa `pb-[max(.75rem,env(safe-area-inset-bottom))]` y `DialogSheet`, `pb-[max(1.5rem,env(safe-area-inset-bottom))]`. Un `DialogSheet` con `p-0` pone ese relleno en su pie de botones, como la carga masiva (`BulkIngredientsModal`).
2. **Una barra fija encima de la `BottomNav` usa `ABOVE_BOTTOM_NAV_CLASS`** de `src/lib/mobile-layout.ts`, como `ProductMobileFooter` y la barra de `/productos/nuevo`. Si cambia el alto de la `BottomNav`, se cambia ahí.
3. **Una pantalla con barra fija deja lugar al final** con un relleno que suma la zona segura. Por ejemplo, `pb-[calc(13rem+env(safe-area-inset-bottom))]` en la ficha del producto.
4. **Los costados en horizontal** los resuelve el `body` en `src/index.css`.

Chromium no simula la zona segura: la prueba que manda es en un iPhone con Face ID, con la app abierta desde el ícono. `src/__tests__/ios-safe-area.test.tsx` exige la directiva del viewport, el relleno lateral del `body` y el inferior de `DialogSheet`.

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
