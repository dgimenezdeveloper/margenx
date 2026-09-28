import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
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
  const { isSignedIn, isLoaded, signOut } = useAuth()
  const navigate = useNavigate()

  // 1. Evaluación síncrona y pura en la fase de render (sin useState ni cascading renders)
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isFreshAuth = searchParams?.get('fresh_auth') === 'true'
  const hasActiveSession =
    typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true'

  // La sesión en esta pestaña es válida si ya estaba activa o si acaba de autenticarse con éxito
  const isSessionValid = hasActiveSession || isFreshAuth

  // Pestaña no autorizada: Clerk retiene cookies pero la pestaña/navegador se reabrió sin sesión activa
  const isUnauthorizedTab = Boolean(isLoaded && isSignedIn && !isSessionValid)

  // 2. El efecto solo realiza tareas de sincronización con sistemas externos (Storage, Clerk, URL)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    if (isFreshAuth) {
      // Registrar la sesión en esta pestaña y limpiar el query param de la URL
      sessionStorage.setItem('margenx_active_session', 'true')
      localStorage.setItem('margenx_last_active', String(Date.now()))
      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    if (isUnauthorizedTab) {
      // Invalidar sesión en Clerk y redirigir al login si no hay sesión activa en esta pestaña
      sessionStorage.removeItem('margenx_active_session')
      localStorage.removeItem('margenx_last_active')
      void signOut().then(() => {
        navigate('/login', { replace: true })
      })
    }
  }, [isLoaded, isSignedIn, isFreshAuth, isUnauthorizedTab, signOut, navigate])

  if (!isClerkConfigured) {
    return <Navigate to="/login" replace />
  }

  // Mientras Clerk carga o si la sesión de la pestaña no está autorizada, mostramos el loader
  if (!isLoaded || isUnauthorizedTab) {
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