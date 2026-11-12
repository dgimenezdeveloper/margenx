import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'

/** Estado de la sesión tal como lo necesitan las pantallas públicas (landing, /instalar, /privacidad). */
export type PublicSessionState = 'checking' | 'signed-in' | 'signed-out'

/**
 * Plazo máximo para esperar a Clerk. Si su script tarda más (red lenta) o no carga (bloqueador),
 * la pantalla pública se muestra como para un visitante sin sesión, en vez de quedar en blanco.
 */
export const PUBLIC_SESSION_TIMEOUT_MS = 1500

/**
 * Evita el "pantallazo": mientras Clerk no confirma si hay sesión, la pantalla no muestra ni la
 * versión con sesión ni la versión sin sesión.
 */
export function usePublicSession(timeoutMs = PUBLIC_SESSION_TIMEOUT_MS): PublicSessionState {
  const { isLoaded, isSignedIn } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const timer = window.setTimeout(() => setTimedOut(true), timeoutMs)
    return () => window.clearTimeout(timer)
  }, [isLoaded, timeoutMs])

  if (isLoaded) return isSignedIn ? 'signed-in' : 'signed-out'
  return timedOut ? 'signed-out' : 'checking'
}
