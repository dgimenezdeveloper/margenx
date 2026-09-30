import { SignedIn, SignedOut, useClerk, useAuth } from '@clerk/clerk-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { isClerkConfigured } from '@/lib/clerkConfig'
import { useSessionSecurity } from '@/hooks/useSessionSecurity'
import { LoaderCircle } from 'lucide-react'

function ProtectedContent({ children }: { children: React.ReactNode }) {
  useSessionSecurity()
  return <>{children}</>
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  // Modo E2E: solo activo durante tests automatizados en entornos de desarrollo/test (nunca en producción compilada)
  const isE2E = (import.meta.env.DEV || import.meta.env.MODE === 'test') &&
    typeof window !== 'undefined' && Boolean(window.navigator.webdriver)

  // Verificamos si la sesión de navegador sigue activa
  const hasBrowserSessionCookie =
    typeof document !== 'undefined' && document.cookie.includes('margenx_session=active')
  const hasTabSession =
    typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true'

  // Evita el kill global: si el navegador sigue abierto y hay otra pestaña activa, sincronizamos sessionStorage
  const isSessionAlive = isE2E || hasTabSession || hasBrowserSessionCookie
  if (hasBrowserSessionCookie && !hasTabSession && typeof window !== 'undefined') {
    sessionStorage.setItem('margenx_active_session', 'true')
  }

  // Sesión huérfana: usuario cerró todas las ventanas del navegador y volvió a entrar
  const isOrphanSession = Boolean(!isE2E && isLoaded && isSignedIn && !isSessionAlive)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isE2E) return

    if (isOrphanSession) {
      sessionStorage.removeItem('margenx_active_session')
      document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      localStorage.removeItem('margenx_last_active')

      void signOut(() => {
        navigate('/login', { replace: true })
      })
    }
  }, [isLoaded, isSignedIn, isOrphanSession, isE2E, signOut, navigate])

  if (!isClerkConfigured) {
    return <Navigate to="/login" replace />
  }

  if (!isLoaded || isOrphanSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  return (
    <>
      <SignedIn>
        <ProtectedContent>{children}</ProtectedContent>
      </SignedIn>
      <SignedOut>
        <Navigate to="/login" replace />
      </SignedOut>
    </>
  )
}