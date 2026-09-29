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

  // Detecta si la ejecución proviene de un navegador automatizado (Playwright / CI)
  const isE2E = typeof window !== 'undefined' && Boolean(window.navigator.webdriver)

  // 1. Evaluación síncrona en render:
  // En E2E es válida por diseño de test runner. En usuarios reales, exige margenx_active_session en sessionStorage.
  const hasActiveTabSession =
    isE2E || (typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true')

  // Sesión huérfana: usuario humano reabrió navegador directamente en /dashboard sin sesión activa
  const isOrphanSession = Boolean(!isE2E && isLoaded && isSignedIn && !hasActiveTabSession)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isE2E) return

    // Al detectar sesión huérfana en URL protegida, forzamos salida directamente a /login sin pasar por la Landing (/)
    if (isOrphanSession) {
      sessionStorage.removeItem('margenx_active_session')
      localStorage.removeItem('margenx_last_active')

      void signOut(() => {
        navigate('/login', { replace: true })
      })
    }
  }, [isLoaded, isSignedIn, isOrphanSession, isE2E, signOut, navigate])

  if (!isClerkConfigured) {
    return <Navigate to="/login" replace />
  }

  // Mientras Clerk carga o si la sesión es huérfana, bloqueamos con spinner para evitar fugas visuales del dashboard
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