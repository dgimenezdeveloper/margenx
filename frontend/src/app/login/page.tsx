'use client'

import Link from 'next/link'
import { SignIn } from '@clerk/clerk-react'
import { ArrowLeft } from 'lucide-react'
import { isClerkConfigured } from '@/lib/clerkConfig'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-5 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Volver a la web
      </Link>
      <section className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="MargenX" className="mx-auto h-20 w-auto object-contain dark:brightness-0 dark:invert" />
          <h1 className="mt-4 text-base font-medium text-gray-500">Inicia sesión en tu comercio</h1>
        </div>
        {isClerkConfigured ? (
          <SignIn fallbackRedirectUrl="/dashboard" routing="path" path="/login" />
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 shadow-sm">
            Configura una clave válida de Clerk en <strong>frontend/.env</strong> para habilitar el inicio de sesión.
          </div>
        )}
      </section>
    </main>
  )
}