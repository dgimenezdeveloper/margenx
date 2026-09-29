'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { SignIn, useAuth, useClerk } from '@clerk/clerk-react'
import { ArrowLeft, Check, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isClerkConfigured } from '@/lib/clerkConfig'
import { useTheme } from '@/hooks/useTheme'

export default function LoginPage() {
  const { isDark } = useTheme()
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const wasLoggedOutRef = useRef(false)

  const isE2E = (import.meta.env.DEV || import.meta.env.MODE === 'test') &&
    typeof window !== 'undefined' && Boolean(window.navigator.webdriver)

  const hasBrowserSessionCookie =
    typeof document !== 'undefined' && document.cookie.includes('margenx_session=active')
  const hasTabSession =
    typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true'

  const isSessionAlive = isE2E || hasTabSession || hasBrowserSessionCookie

  // Sesión residual: Clerk tiene cookies pero el navegador se cerró previamente
  const isStaleSession = Boolean(!isE2E && isLoaded && isSignedIn && !isSessionAlive)

  const authorizeSession = () => {
    sessionStorage.setItem('margenx_active_session', 'true')
    document.cookie = 'margenx_session=active; path=/; SameSite=Lax'
    localStorage.setItem('margenx_last_active', String(Date.now()))
  }

  useEffect(() => {
    if (!isLoaded) return

    // 1. Si ya tiene sesión activa en esta misma sesión de navegador, va directo al dashboard
    if (isSessionAlive && isSignedIn) {
      authorizeSession()
      navigate('/dashboard', { replace: true })
      return
    }

    // 2. Si reabrió el navegador tras cerrarlo y entra a /login con cookies residuales de Clerk,
    // destruimos la sesión con callback para evitar que Clerk lo rebote a la Landing (/)
    if (isStaleSession) {
      sessionStorage.removeItem('margenx_active_session')
      document.cookie = 'margenx_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      localStorage.removeItem('margenx_last_active')

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
      authorizeSession()
      navigate('/dashboard', { replace: true })
    }
  }, [isLoaded, isSignedIn, isSessionAlive, isStaleSession, isE2E, signOut, navigate])

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
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Volver a la web
      </Link>
      <section className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="MargenX"
            className="logo-adaptive mx-auto h-20 w-auto object-contain transition-[filter] duration-150"
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
              fallbackRedirectUrl="/dashboard"
              forceRedirectUrl="/dashboard"
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
      </section>
    </main>
  )
}