'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SignIn } from '@clerk/clerk-react'
import { ArrowLeft, Check } from 'lucide-react'
import { isClerkConfigured } from '@/lib/clerkConfig'
import { useTheme } from '@/hooks/useTheme'

export default function LoginPage() {
  const { isDark } = useTheme()

  // Leemos la razón de salida tanto de sessionStorage como de la URL
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
        {isClerkConfigured ? (
          <SignIn
            fallbackRedirectUrl="/dashboard?fresh_auth=true"
            routing="path"
            path="/login"
            appearance={{
              variables: isDark ? {
                colorBackground: '#111827', // bg-gray-900 (Fondo de la tarjeta)
                colorText: '#f9fafb',       // text-gray-50 (Texto principal)
                colorInputBackground: '#1f2937', // bg-gray-800 (Fondo de los inputs)
                colorInputText: '#f9fafb',  // text-gray-50 (Texto de los inputs)
                colorPrimary: '#4f46e5',    // bg-indigo-600 (Botón principal)
                colorTextSecondary: '#9ca3af', // text-gray-400 (Textos secundarios)
              } : {
                colorPrimary: '#4f46e5',    // bg-indigo-600 (Mantenemos el color de marca en modo claro)
              }
            }}
          />
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 shadow-sm">
            Configura una clave válida de Clerk en <strong>frontend/.env</strong> para habilitar el inicio de sesión.
          </div>
        )}
      </section>
    </main>
  )
}