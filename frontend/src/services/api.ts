export type TokenGetter = () => Promise<string | null>

export class ApiError extends Error {
  readonly status: number
  /** Cuerpo JSON de la respuesta de error, si lo hubo: algunos 409 traen datos para resolver el conflicto (#427). */
  readonly body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function readError(response: Response): Promise<{ message: string; body?: unknown }> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const error = body.error
      if (typeof error === 'string') return { message: error, body }
    }
    return { message: `La solicitud falló (${response.status}).`, body }
  } catch {
    // La respuesta puede no contener JSON legible.
  }

  return { message: `La solicitud falló (${response.status}).` }
}

async function sendApiRequest(
  path: string,
  getToken: TokenGetter,
  init: RequestInit,
  accept: string,
): Promise<Response> {
  const token = await getToken()
  const headers = new Headers(init.headers)
  headers.set('Accept', accept)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers })

  if (!response.ok) {
    const { message, body } = await readError(response)
    // Lanzamos la excepción para que la capture el llamador sin provocar bucles de navegación forzada
    throw new ApiError(message, response.status, body)
  }

  return response
}

export async function fetchApi<T>(
  path: string,
  getToken: TokenGetter,
  init: RequestInit = {},
): Promise<T> {
  const response = await sendApiRequest(path, getToken, init, 'application/json')

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Descarga un archivo binario (por ejemplo, un PDF) con el mismo manejo de errores que `fetchApi`. */
export async function fetchApiFile(
  path: string,
  getToken: TokenGetter,
  accept: string,
): Promise<{ blob: Blob; headers: Headers }> {
  const response = await sendApiRequest(path, getToken, {}, accept)
  return { blob: await response.blob(), headers: response.headers }
}
