'use client'

import { ArrowLeft, Check, Monitor, Phone, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PublicSessionLink } from '@/components/public-session-link'

interface GuideStep {
  text: string
  image?: string
  imageAlt?: string
  /** Capturas apaisadas (escritorio): se muestran más anchas para que se lean, sin pasar el ancho de la tarjeta. */
  imageWide?: boolean
}

interface GuideSection {
  title: string
  steps: GuideStep[]
  icon: typeof Smartphone
}

const guideSections: GuideSection[] = [
  {
    title: 'Android · Chrome',
    steps: [
      {
        text: 'Abrí MargenX en Chrome. Si arriba aparece el aviso “Instalar MargenX”, tocá “Instalar” y listo.',
        image: '/guia-instalacion/android-1-aviso-instalar.png',
        imageAlt: 'Landing de MargenX en Chrome con el aviso “Instalar MargenX” y su botón Instalar arriba',
      },
      {
        text: 'Si el aviso no aparece o lo cerraste, tocá el botón de menú (tres puntos) en la esquina superior derecha.',
        image: '/guia-instalacion/android-2-chrome-menu.png',
        imageAlt: 'Landing de MargenX en Chrome sin el aviso, con el botón de menú de tres puntos en la esquina superior derecha',
      },
      {
        text: 'Seleccioná “Instalar y crear acceso directo” (en otras versiones de Chrome: “Instalar app” o “Agregar a pantalla de inicio”).',
        image: '/guia-instalacion/android-3-instalar-app.png',
        imageAlt: 'Menú de Chrome abierto con la opción “Instalar y crear acceso directo”',
      },
      {
        text: 'Elegí “Instalar” (no “Crear acceso directo”, que abre MargenX dentro de Chrome) y accederás desde el ícono en la pantalla principal.',
        image: '/guia-instalacion/android-4-confirmar.png',
        imageAlt: 'Opciones de Chrome “Instalar” y “Crear acceso directo” para MargenX',
      },
    ],
    icon: Smartphone,
  },
  {
    title: 'iPhone · Safari',
    steps: [
      {
        text: 'Abre la web en Safari y toca el botón de compartir en la parte inferior.',
        image: '/guia-instalacion/iphone-1-safari-compartir.png',
        imageAlt: 'Landing de MargenX en Safari con el botón de compartir resaltado en la barra inferior',
      },
      {
        text: 'Elegí “Agregar a Inicio” (puede que tengas que deslizar la lista para encontrarla).',
        image: '/guia-instalacion/iphone-2-agregar-a-inicio.png',
        imageAlt: 'Panel para compartir de Safari con la opción “Agregar a Inicio” visible en la lista',
      },
      {
        text: 'Confirmá el nombre y tocá “Agregar”: el acceso quedará disponible desde tu home screen.',
        image: '/guia-instalacion/iphone-3-confirmar.png',
        imageAlt: 'Diálogo de confirmación “Agregar a Inicio” con el botón Agregar',
      },
    ],
    icon: Phone,
  },
  {
    title: 'Escritorio · Chrome o Edge',
    steps: [
      {
        text: 'Entrá a MargenX desde Chrome o Edge.',
        image: '/guia-instalacion/escritorio-1-abrir-margenx.png',
        imageAlt: 'MargenX abierto en Edge, con margenx.tech en la barra de direcciones',
        imageWide: true,
      },
      {
        text: 'Buscá el ícono de instalación en la barra de direcciones o el menú de la pestaña.',
        image: '/guia-instalacion/escritorio-2-icono-instalar.png',
        imageAlt: 'Ícono de instalación de la app, marcado en la barra de direcciones de Edge',
        imageWide: true,
      },
      {
        text: 'Elegí “Instalar” para crear un acceso directo del sistema en tu computadora.',
        image: '/guia-instalacion/escritorio-3-confirmar.png',
        imageAlt: 'Cuadro “Instalar MargenX” de Edge con los botones Instalar y Ahora no',
        imageWide: true,
      },
    ],
    icon: Monitor,
  },
]

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
          <PublicSessionLink
            signedOut={{ to: '/login', label: 'Ingresar' }}
            className="rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          />
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
            {guideSections.map(({ title, steps, icon: Icon }) => {
              return (
                <section key={title} className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <Icon className="size-4" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white md:text-lg">{title}</h2>
                  </div>

                  <ol className="space-y-4">
                    {steps.map((step, idx) => (
                      <li key={step.text} className="space-y-2">
                        <div className="flex items-start gap-3 text-xs leading-5 text-gray-600 dark:text-gray-300 md:text-sm md:leading-6">
                          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">
                            {idx + 1}
                          </span>
                          <span>{step.text}</span>
                        </div>
                        {step.image && (
                          <img
                            src={step.image}
                            alt={step.imageAlt ?? ''}
                            loading="lazy"
                            className={`ml-8 ${step.imageWide ? 'w-56' : 'w-36'} max-w-[calc(100%-2rem)] rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700`}
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )
            })}
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
