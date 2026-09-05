'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, LockKeyhole, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push('/dashboard')
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-5 py-10 text-gray-950 dark:bg-gray-950 dark:text-gray-100">
      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-indigo-600"
      >
        <ArrowLeft className="size-4" /> Volver a la web
      </Link>
      <section className="w-full max-w-sm">
        <div className="text-center">
          <img src="/logo.png" alt="MargenX" className="mx-auto h-20 w-auto object-contain dark:brightness-0 dark:invert" />
          <h1 className="mt-4 text-base font-medium text-gray-500">Inicia sesión en tu comercio</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Email
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="email"
                placeholder="admin@comercio.com"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold">
            Contraseña
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </label>

          <button
            type="submit"
            className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
          >
            Ingresar al sistema
            <ArrowRight className="size-4" />
          </button>
        </form>
      </section>
    </main>
  )
}