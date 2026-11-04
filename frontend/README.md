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
│   ├── insumos/              # Solo ADMIN (redirige a /productos si no)
│   ├── login/
│   ├── perfil/
│   ├── productos/
│   │   ├── [id]/             # Ficha técnica + receta de un producto
│   │   └── nuevo/
│   └── proveedores/
│       └── cuarentena/       # Solo ADMIN — bandeja de precios en cuarentena
├── components/       # Compartidos entre rutas (navbar, toasts, diálogos, guards de ruta)
│   └── ui/           # Primitivas accesibles estilizadas (button, dialog, etc.)
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

Pendiente — la añade la issue de Sprint 5 S5-FE-05 (manifest + service worker), que todavía no está mergeada a `develop` al escribir esto. Una vez que esté:

1. `npm run build && npm run preview` (una PWA no es instalable en el servidor de desarrollo, solo sobre el build de producción).
2. Chrome/Edge DevTools → pestaña **Application** → **Manifest**: confirmar que carga sin errores y que el ícono es el correcto.
3. Lighthouse (DevTools → **Lighthouse** → categoría **PWA**, o `npx lighthouse http://localhost:4173 --view`): el audit de instalabilidad debe pasar.
4. Confirmar en un dispositivo real (Android/Chrome o iOS/Safari) que aparece el prompt o la opción "Agregar a pantalla de inicio".

Esta sección se actualiza con los pasos reales en cuanto S5-FE-05 esté mergeada.
