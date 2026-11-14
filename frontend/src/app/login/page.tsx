'use client'

import { useEffect, useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SignIn, useAuth, useClerk } from '@clerk/clerk-react'
import { ArrowLeft, Check, LoaderCircle } from 'lucide-react'
import { isClerkConfigured } from '@/lib/clerkConfig'
import { isStandaloneMode } from '@/lib/displayMode'
import { clearStoredReturnUrl, resolveReturnUrl } from '@/lib/returnUrl'
import { clearSessionCaches } from '@/lib/serviceWorkerCache'
import { useTheme } from '@/hooks/useTheme'

export default function LoginPage() {
  const { isDark } = useTheme()
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const location = useLocation()
  const wasLoggedOutRef = useRef(false)
  // Destino tras el login (por ejemplo, el producto del enlace "Ajustar"); se resuelve una vez al montar
  const [returnUrl] = useState(() => resolveReturnUrl(location.search))

  const isE2E = (import.meta.env.DEV || import.meta.env.MODE === 'test') &&
    typeof window !== 'undefined' && Boolean(window.navigator.webdriver)

  const hasBrowserSessionCookie =
    typeof document !== 'undefined' && document.cookie.includes('margenx_session=active')
  const hasTabSession =
    typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true'

  // En la app instalada cerrar la app no cierra la sesión: manda la duración configurada en Clerk (ADR-006)
  const isSessionAlive = isE2E || isStandaloneMode() || hasTabSession || hasBrowserSessionCookie

  // Sesión residual: Clerk tiene cookies pero el navegador se cerró previamente
  const isStaleSession = Boolean(!isE2E && isLoaded && isSignedIn && !isSessionAlive)

  const authorizeSession = () => {
    sessionStorage.setItem('margenx_active_session', 'true')
    document.cookie = 'margenx_session=active; path=/; SameSite=Lax'
    localStorage.setItem('margenx_last_active', String(Date.now()))
  }

  useEffect(() => {
    if (!isLoaded) return

    const goToReturnUrl = () => {
      authorizeSession()
      clearStoredReturnUrl()
      navigate(returnUrl, { replace: true })
    }

    // 1. Si ya tiene sesión activa (en esta sesión de navegador o en la app instalada), va directo al destino
    if (isSessionAlive && isSignedIn) {
      goToReturnUrl()
      return
    }

    // 2. Si reabrió el navegador tras cerrarlo y entra a /login con cookies residuales de Clerk,
    // destruimos la sesión con callback para evitar que Clerk lo rebote a la Landing (/)
    if (isStaleSession) {
      sessionStorage.removeItem('margenx_active_session')
      document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      localStorage.removeItem('margenx_last_active')
      void clearSessionCaches()

      void signOut(() => {
        wasLoggedOutRef.current = true
      })
      return
    }

    // 3. Si no está autenticado, marcamos que empezó deslogueado
    if (!isSignedIn) {
      wasLoggedOutRef.current = true
    } else if (isSignedIn && wasLoggedOutRef.current) {
      // 4. Si estaba deslogueado y acaba de completar el login con éxito (humano o Playwright)
      goToReturnUrl()
    }
  }, [isLoaded, isSignedIn, isSessionAlive, isStaleSession, isE2E, signOut, navigate, returnUrl])

  // Toast de inactividad
  const [toast, setToast] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const logoutReason = sessionStorage.getItem('margenx_logout_reason')
      if (logoutReason === 'inactivity') {
        sessionStorage.removeItem('margenx_logout_reason')
        return 'Sesión cerrada por inactividad por motivos de seguridad.'
      }

      const params = new URLSearchParams(window.location.search)
      if (params.get('reason') === 'inactivity') {
        return 'Sesión cerrada por inactividad por motivos de seguridad.'
      }
    }
    return null
  })

  useEffect(() => {
    if (toast) {
      window.history.replaceState({}, document.title, window.location.pathname)
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-5 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-4">
          <Check className="size-5 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      <Link
        to="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Volver a la web
      </Link>
      <section className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="MargenX"
            className="mx-auto h-20 w-auto object-contain transition-all duration-150 dark:brightness-0 dark:invert"
          />
          <h1 className="mt-4 text-base font-medium text-gray-500">Inicia sesión en tu comercio</h1>
        </div>

        {!isLoaded || isStaleSession ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : isClerkConfigured ? (
          <div
            onClickCapture={authorizeSession}
            onKeyDownCapture={authorizeSession}
            onFocusCapture={authorizeSession}
          >
            <SignIn
              fallbackRedirectUrl={returnUrl}
              forceRedirectUrl={returnUrl}
              routing="path"
              path="/login"
              appearance={{
                variables: isDark
                  ? {
                      colorBackground: '#111827',
                      colorText: '#f9fafb',
                      colorInputBackground: '#1f2937',
                      colorInputText: '#f9fafb',
                      colorPrimary: '#4f46e5',
                      colorTextSecondary: '#9ca3af',
                    }
                  : {
                      colorPrimary: '#4f46e5',
                    },
              }}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 shadow-sm">
            Configura una clave válida de Clerk en <strong>frontend/.env</strong> para habilitar el inicio de sesión.
          </div>
        )}

        {/* Enlaces públicos al pie, discretos: el formulario es lo primero que se ve. */}
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <Link
            to="/privacidad"
            className="underline-offset-2 hover:text-indigo-600 hover:underline focus-visible:underline dark:hover:text-indigo-300"
          >
            Política de privacidad
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to="/instalar"
            className="underline-offset-2 hover:text-indigo-600 hover:underline focus-visible:underline dark:hover:text-indigo-300"
          >
            Guía de instalación
          </Link>
        </footer>
      </section>
    </main>
  )
}