export type TokenGetter = () => Promise<string | null>

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const error = body.error
      if (typeof error === 'string') return error
    }
  } catch {
    // La respuesta puede no contener JSON legible.
  }

  return `La solicitud falló (${response.status}).`
}

export async function fetchApi<T>(
  path: string,
  getToken: TokenGetter,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.assign('/login')
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}