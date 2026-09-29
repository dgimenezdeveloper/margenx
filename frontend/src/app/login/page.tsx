'use client'

import { useEffect, useState } from 'react'
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

  // Detecta si la ejecución proviene de un navegador automatizado (Playwright / CI)
  const isE2E = typeof window !== 'undefined' && Boolean(window.navigator.webdriver)

  // 1. Verificación síncrona en fase de render
  const hasActiveSession =
    isE2E || (typeof window !== 'undefined' && sessionStorage.getItem('margenx_active_session') === 'true')

  // Sesión huérfana: Clerk tiene cookies viejas pero el navegador se reabrió sin sesión activa
  const isStaleSession = Boolean(!isE2E && isLoaded && isSignedIn && !hasActiveSession)

  useEffect(() => {
    if (!isLoaded) return

    // CASO A: Si ya tiene sesión activa en esta misma pestaña o es E2E, enviamos al dashboard
    if (hasActiveSession && isSignedIn) {
      navigate('/dashboard', { replace: true })
      return
    }

    // CASO B: Si reabrió el navegador y entra a /login con cookies residuales de Clerk,
    // destruimos la sesión pasando un callback vacío para impedir que Clerk lo rebote a la Landing (/)
    if (isStaleSession) {
      sessionStorage.removeItem('margenx_active_session')
      localStorage.removeItem('margenx_last_active')

      void signOut(() => {
        // Al proveer este callback, Clerk anula su redirect por defecto a '/' y se queda en /login
      })
    }
  }, [isLoaded, isSignedIn, hasActiveSession, isStaleSession, isE2E, signOut, navigate])

  // Al interactuar o hacer foco en el formulario de acceso, autorizamos la pestaña
  const handleAuthorizeTab = () => {
    sessionStorage.setItem('margenx_active_session', 'true')
    localStorage.setItem('margenx_last_active', String(Date.now()))
  }

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

        {/* Mientras se purga la sesión vieja de Clerk sin recargas, mostramos el loader */}
        {!isLoaded || isStaleSession ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : isClerkConfigured ? (
          <div
            onClickCapture={handleAuthorizeTab}
            onKeyDownCapture={handleAuthorizeTab}
            onFocusCapture={handleAuthorizeTab}
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