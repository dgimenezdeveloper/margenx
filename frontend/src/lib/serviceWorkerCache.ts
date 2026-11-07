// Limpieza de las cachés del service worker al cerrar sesión. Ver docs/Arquitectura-Software-(SAD).md §4.

export interface CacheStorageLike {
  keys: () => Promise<string[]>
  delete: (cacheName: string) => Promise<boolean>
}

// El precache solo guarda el shell del build (HTML, JS, CSS e íconos), sin datos del comercio.
// Se conserva para que la página Sin conexión siga disponible después de cerrar sesión.
const PRECACHE_PREFIX = 'workbox-precache'

function defaultCacheStorage(): CacheStorageLike | undefined {
  return typeof caches === 'undefined' ? undefined : caches
}

export async function clearSessionCaches(
  storage: CacheStorageLike | undefined = defaultCacheStorage(),
): Promise<void> {
  if (!storage) return
  try {
    const names = await storage.keys()
    await Promise.all(
      names.filter((name) => !name.startsWith(PRECACHE_PREFIX)).map((name) => storage.delete(name)),
    )
  } catch {
    // Cache Storage puede no estar disponible (navegación privada, contexto inseguro).
    // El cierre de sesión sigue igual: la API nunca se guarda en caché.
  }
}
