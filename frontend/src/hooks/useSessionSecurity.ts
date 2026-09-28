import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutos

export function useSessionSecurity() {
  const { isSignedIn, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSignedIn) return

    // 1. Protección ante cierre de pestaña o navegador
    const activeSession = sessionStorage.getItem('margenx_active_session')
    if (!activeSession) {
      // Si no hay sesión en sessionStorage (ej. abrió nueva pestaña), forzamos cierre
      signOut()
      return
    }

    // 2. Temporizador de inactividad
    let timeoutId: ReturnType<typeof setTimeout>

    const handleLogout = async () => {
      await signOut()
      sessionStorage.removeItem('margenx_active_session')
      navigate('/login?reason=inactivity')
    }

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleLogout, INACTIVITY_LIMIT)
    }

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(event => window.addEventListener(event, resetTimer))

    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [isSignedIn, signOut, navigate])
}