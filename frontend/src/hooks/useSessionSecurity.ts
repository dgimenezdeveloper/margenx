import { useEffect, useRef, useCallback } from 'react'
import { useClerk, useAuth } from '@clerk/clerk-react'

// 30 minutos exactos (1.800.000 ms) según la historia de usuario
const DEFAULT_INACTIVITY_LIMIT = 30 * 60 * 1000
const LAST_ACTIVE_KEY = 'margenx_last_active'
const LOGOUT_REASON_KEY = 'margenx_logout_reason'
const ACTIVE_SESSION_KEY = 'margenx_active_session'

function getInactivityLimit(): number {
  // Overrides de prueba estrictamente bloqueados en producción (solo disponibles en dev/test)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const custom = (window as unknown as { __MARGENX_INACTIVITY_LIMIT__?: number }).__MARGENX_INACTIVITY_LIMIT__
    if (typeof custom === 'number' && custom > 0) return custom

    const storedTest = localStorage.getItem('MARGENX_TEST_TIMEOUT')
    if (storedTest && Number(storedTest) > 0) return Number(storedTest)

    const envLimit = Number(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS)
    if (!isNaN(envLimit) && envLimit > 0) return envLimit
  }
  return DEFAULT_INACTIVITY_LIMIT
}

export function useSessionSecurity() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const isLoggingOutRef = useRef(false)
  const lastThrottleRef = useRef(0)

  const handleInactivityLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    sessionStorage.removeItem(ACTIVE_SESSION_KEY)
    document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    localStorage.removeItem(LAST_ACTIVE_KEY)
    sessionStorage.setItem(LOGOUT_REASON_KEY, 'inactivity')

    try {
      await signOut(() => {})
    } finally {
      window.location.href = '/login?reason=inactivity'
    }
  }, [signOut])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    if (!localStorage.getItem(LAST_ACTIVE_KEY)) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
    }

    const checkInactivity = () => {
      if (isLoggingOutRef.current) return
      const currentTime = Date.now()
      const lastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || currentTime)
      const limit = getInactivityLimit()

      if (currentTime - lastActive >= limit) {
        void handleInactivityLogout()
      }
    }

    const recordUserActivity = () => {
      const currentTime = Date.now()
      if (currentTime - lastThrottleRef.current > 2000) {
        lastThrottleRef.current = currentTime
        localStorage.setItem(LAST_ACTIVE_KEY, String(currentTime))
      }
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((evt) => window.addEventListener(evt, recordUserActivity, { passive: true }))

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkInactivity)

    const intervalId = setInterval(checkInactivity, 2000)

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordUserActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkInactivity)
      clearInterval(intervalId)
    }
  }, [isLoaded, isSignedIn, handleInactivityLogout])
}