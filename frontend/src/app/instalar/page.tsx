'use client'

import { ArrowLeft, Check, Monitor, Phone, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

const guideSections = [
  {
    title: 'Android · Chrome',
    steps: [
      'Abre MargenX en Chrome y toca el botón de menú en la esquina superior derecha.',
      'Selecciona “Instalar app” o “Agregar a pantalla de inicio”.',
      'Confirmá la instalación y accederás desde el acceso directo en la pantalla principal.',
    ],
    icon: Smartphone,
  },
  {
    title: 'iPhone · Safari',
    steps: [
      'Abre la web en Safari y toca el botón de compartir en la parte inferior.',
      'Elegí “Agregar a pantalla de inicio”.',
      'Confirmá el nombre y el acceso quedará disponible desde tu home screen.',
    ],
    icon: Phone,
  },
  {
    title: 'Escritorio · Chrome o Edge',
    steps: [
      'Entrá a MargenX desde Chrome o Edge.',
      'Buscá el ícono de instalación en la barra de direcciones o el menú de la pestaña.',
      'Elegí “Instalar” para crear un acceso directo del sistema en tu computadora.',
    ],
    icon: Monitor,
  },
] as const

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-col px-4 pb-10 pt-5 md:max-w-5xl md:px-8 md:pt-8">
        <div className="mb-5 flex items-center justify-between gap-3 md:mb-7">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <ArrowLeft className="size-4" /> Volver
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            Ingresar
          </Link>
        </div>

        <article className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:p-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Smartphone className="size-3.5" /> Guía de instalación
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white md:text-4xl">
            Instalá MargenX en tu celular o computadora
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300 md:max-w-2xl md:text-base md:leading-7">
            La app está pensada para abrirse como una aplicación rápida desde el navegador, sin instalar nada pesado. Esto te permite tener acceso directo a la gestión de costos desde tu celular o escritorio.
          </p>

          <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3">
            {guideSections.map(({ title, steps, icon: Icon }) => (
              <section key={title} className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Icon className="size-4" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white md:text-lg">{title}</h2>
                </div>

                <div className="mb-4 rounded-2xl border border-dashed border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-900/80">
                  <div className="flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-gray-100 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:from-gray-800 dark:to-gray-900 dark:text-gray-500">
                    <span className="block">Captura del paso</span>
                  </div>
                </div>

                <ol className="space-y-3">
                  {steps.map((step, idx) => (
                    <li key={step} className="flex items-start gap-3 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm md:leading-6">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200 md:text-sm md:leading-6">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <Check className="size-4" /> Recomendación importante
            </div>
            En iPhone, Safari es la opción recomendada. En Android, Chrome mantiene la instalación más estable. En escritorio, Chrome y Edge soportan la instalación directa desde la barra de direcciones.
          </div>
        </article>
      </div>
    </main>
  )
}
