// URL de retorno tras el login: el enlace "Ajustar" del mail de alerta vuelve al producto
// después de iniciar sesión. Ver docs/adr/0006-sesion-persistente-pwa.md.

export const RETURN_URL_PARAM = 'redirect_url'
export const DEFAULT_RETURN_URL = '/dashboard'
const STORED_RETURN_URL_KEY = 'margenx_return_url'

type RouteLocation = { pathname: string; search: string; hash: string }

function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
}

/** Devuelve la ruta interna si es segura para redirigir; null si es de otro dominio, vacía o el propio login. */
export function sanitizeReturnUrl(raw: string | null, origin: string = currentOrigin()): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return null

  let url: URL
  try {
    url = new URL(raw, origin)
  } catch {
    return null
  }
  if (url.origin !== origin) return null
  if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return null

  return `${url.pathname}${url.search}${url.hash}`
}

export function buildLoginUrl(location: RouteLocation, reason?: 'inactivity'): string {
  const params = new URLSearchParams()
  const target = sanitizeReturnUrl(`${location.pathname}${location.search}${location.hash}`)
  if (target && target !== DEFAULT_RETURN_URL) params.set(RETURN_URL_PARAM, target)
  if (reason) params.set('reason', reason)

  const query = params.toString()
  return query ? `/login?${query}` : '/login'
}

/**
 * Destino al que se vuelve después del login. Se recuerda en sessionStorage porque los pasos
 * internos de Clerk (por ejemplo /login/factor-one) no conservan la query original.
 */
export function resolveReturnUrl(search: string, origin: string = currentOrigin()): string {
  const fromQuery = sanitizeReturnUrl(new URLSearchParams(search).get(RETURN_URL_PARAM), origin)
  if (fromQuery) {
    sessionStorage.setItem(STORED_RETURN_URL_KEY, fromQuery)
    return fromQuery
  }
  return sanitizeReturnUrl(sessionStorage.getItem(STORED_RETURN_URL_KEY), origin) ?? DEFAULT_RETURN_URL
}

export function clearStoredReturnUrl(): void {
  sessionStorage.removeItem(STORED_RETURN_URL_KEY)
}
