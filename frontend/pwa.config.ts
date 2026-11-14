import type { VitePWAOptions } from 'vite-plugin-pwa'

// Estrategia de caché del service worker: ver "Estrategia de Caché del Frontend (PWA)"
// en docs/Arquitectura-Software-(SAD).md §4.

export const OFFLINE_FALLBACK_URL = '/offline.html'

interface RouteMatch {
  url: URL
  request: { mode: string }
  sameOrigin: boolean
}

// workbox-build copia estas dos funciones al sw.js con toString(): no pueden usar
// nada definido fuera de su cuerpo (constantes, imports ni otras funciones).

// Llamadas a la API, en su dominio (api.margenx.tech) o en el mismo origen.
export function isApiRequest({ url }: RouteMatch): boolean {
  return /^\/api(\/|$)/.test(url.pathname)
}

// Navegaciones de la app que reciben la página Sin conexión si falla la red.
// Denylist: la API y las rutas de Clerk (login, proxy y parámetros de handshake) nunca se interceptan.
export function isAppNavigation({ url, request, sameOrigin }: RouteMatch): boolean {
  if (request.mode !== 'navigate' || !sameOrigin) return false
  if (/^\/(api|login|__clerk)(\/|$)/.test(url.pathname)) return false
  return !/[?&]__clerk/.test(url.search)
}

export const pwaOptions: Partial<VitePWAOptions> = {
  // La versión nueva espera a que el usuario toque "Actualizar" (src/components/pwa-update-prompt.tsx).
  registerType: 'prompt',
  injectRegister: false,
  // El manifest ya existe en public/manifest.webmanifest.
  manifest: false,
  includeManifestIcons: false,
  workbox: {
    globPatterns: [
      '**/*.{js,css,html}',
      'favicon.ico',
      'icon.svg',
      'icon-*.png',
      'apple-touch-icon.png',
      'logo-icon.png',
    ],
    // El HTML del shell que se precachea es offline.html: index.html siempre se pide a la red,
    // así cada apertura con conexión carga la versión publicada y nunca un HTML viejo.
    // ExcelJS (~930 kB) solo se usa al descargar la plantilla de insumos (import() dinámico en
    // src/lib/bulkIngredients.ts): se pide a la red en ese momento y no se precachea en cada dispositivo.
    globIgnores: ['index.html', '**/exceljs*.js'],
    navigateFallback: null,
    directoryIndex: null,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      { urlPattern: isApiRequest, handler: 'NetworkOnly' },
      {
        urlPattern: isAppNavigation,
        handler: 'NetworkOnly',
        options: { precacheFallback: { fallbackURL: OFFLINE_FALLBACK_URL } },
      },
    ],
  },
}
