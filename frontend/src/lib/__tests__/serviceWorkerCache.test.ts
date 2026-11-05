import { describe, it, expect, vi } from 'vitest'
import { clearSessionCaches, type CacheStorageLike } from '../serviceWorkerCache'

function fakeCacheStorage(names: string[]): CacheStorageLike & { remaining: string[] } {
  const remaining = [...names]
  return {
    remaining,
    keys: vi.fn(async () => [...remaining]),
    delete: vi.fn(async (name: string) => {
      const index = remaining.indexOf(name)
      if (index === -1) return false
      remaining.splice(index, 1)
      return true
    }),
  }
}

describe('clearSessionCaches', () => {
  it('borra las cachés de tiempo de ejecución y conserva el precache del shell', async () => {
    const storage = fakeCacheStorage([
      'workbox-precache-v2-https://dev.margenx.tech/',
      'workbox-runtime-https://dev.margenx.tech/',
      'margenx-productos',
    ])

    await clearSessionCaches(storage)

    expect(storage.remaining).toEqual(['workbox-precache-v2-https://dev.margenx.tech/'])
  })

  it('no hace nada si no hay cachés', async () => {
    const storage = fakeCacheStorage([])

    await clearSessionCaches(storage)

    expect(storage.delete).not.toHaveBeenCalled()
  })

  it('no falla si el navegador no tiene Cache Storage', async () => {
    await expect(clearSessionCaches(undefined)).resolves.toBeUndefined()
  })

  it('no bloquea el cierre de sesión si Cache Storage falla', async () => {
    const storage: CacheStorageLike = {
      keys: vi.fn(async () => {
        throw new Error('SecurityError')
      }),
      delete: vi.fn(),
    }

    await expect(clearSessionCaches(storage)).resolves.toBeUndefined()
  })

  it('usa window.caches por defecto', async () => {
    const storage = fakeCacheStorage(['margenx-dashboard'])
    vi.stubGlobal('caches', storage)

    await clearSessionCaches()

    expect(storage.remaining).toEqual([])
    vi.unstubAllGlobals()
  })
})
