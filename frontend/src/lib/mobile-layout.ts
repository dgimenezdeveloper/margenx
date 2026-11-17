/**
 * Ubica una barra fija de mobile justo encima de la BottomNav, sin hueco ni superposición.
 *
 * La BottomNav (`components/bottom-nav.tsx`) mide 3.125rem (borde de 1 px, `pt-2.5` y una pestaña
 * de 39 px con ícono, separación y etiqueta) más su relleno inferior, `max(.75rem, zona segura)`.
 * Con `viewport-fit=cover` en `index.html`, la zona segura es la franja de la línea de inicio del
 * iPhone en la app instalada. Si cambia el alto de la BottomNav, cambia también este valor.
 */
export const ABOVE_BOTTOM_NAV_CLASS = 'bottom-[calc(3.125rem+max(0.75rem,env(safe-area-inset-bottom)))]'
