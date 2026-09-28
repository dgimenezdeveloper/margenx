import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

// Por defecto 30 minutos (1.800.000 ms) según la historia de usuario
const DEFAULT_INACTIVITY_LIMIT = 30 * 60 * 1000
const LAST_ACTIVE_KEY = 'margenx_last_active'
const LOGOUT_REASON_KEY = 'margenx_logout_reason'
const ACTIVE_SESSION_KEY = 'margenx_active_session'

function getInactivityLimit(): number {
  if (typeof window !== 'undefined') {
    // Permite acelerar el temporizador para pruebas en consola (ej: window.__MARGENX_INACTIVITY_LIMIT__ = 60000 para 1 min)
    const custom = (window as unknown as { __MARGENX_INACTIVITY_LIMIT__?: number }).__MARGENX_INACTIVITY_LIMIT__
    if (typeof custom === 'number' && custom > 0) {
      return custom
    }
  }
  return DEFAULT_INACTIVITY_LIMIT
}

export function useSessionSecurity() {
  const { isSignedIn, isLoaded, signOut } = useAuth()
  const isLoggingOutRef = useRef(false)
  const lastThrottleRef = useRef(0)

  const handleInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    sessionStorage.removeItem(ACTIVE_SESSION_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
    sessionStorage.setItem(LOGOUT_REASON_KEY, 'inactivity')

    try {
      await signOut()
    } finally {
      // Redirección completa para limpiar estado en memoria y mostrar el toast de forma garantizada
      window.location.href = '/login?reason=inactivity'
    }
  }, [signOut])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    // 1. Inicializar marca de tiempo SOLO si no existía (evita reiniciarla en cada re-render)
    if (!localStorage.getItem(LAST_ACTIVE_KEY)) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
    }

    // 2. Evaluador de inactividad contra el tiempo real del sistema
    const checkInactivity = () => {
      if (isLoggingOutRef.current) return
      const currentTime = Date.now()
      const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || currentTime)
      const limit = getInactivityLimit()

      if (currentTime - lastActive >= limit) {
        void handleInactivityLogout()
      }
    }

    // 3. Listener de actividad de usuario (throttle de 2s para no saturar I/O)
    const recordUserActivity = () => {
      const currentTime = Date.now()
      if (currentTime - lastThrottleRef.current > 2000) {
        lastThrottleRef.current = currentTime
        localStorage.setItem(LAST_ACTIVE_KEY, String(currentTime))
      }
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((evt) => window.addEventListener(evt, recordUserActivity, { passive: true }))

    // 4. Verificación cuando el usuario cambia de pestaña o despierta el equipo
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkInactivity)

    // 5. Pulso periódico cada 2 segundos
    const intervalId = setInterval(checkInactivity, 2000)

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordUserActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkInactivity)
      clearInterval(intervalId)
    }
  }, [isLoaded, isSignedIn, handleInactivityLogout])
}