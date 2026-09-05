'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  Menu,
  Moon,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  X
} from 'lucide-react'
import { useState } from 'react'

const benefits = [
  [
    Target,
    'Decisiones con rentabilidad real',
    'Fijá tus precios de venta con base en el costo exacto de tus recetas, no en estimaciones o intuiciones.'
  ],
  [
    RefreshCw,
    'Recálculo automático en cascada',
    'Cuando sube el precio de un insumo (harina, carne, cloro o envases), todos los productos que lo usan se actualizan al instante.'
  ],
  [
    ShieldCheck,
    'Alertas antes de perder dinero',
    'Notificaciones visuales y por email en cuanto un producto cae por debajo del margen mínimo de ganancia esperado.'
  ]
] as const

const steps = [
  {
    number: '01',
    title: 'Cargá tus insumos',
    desc: 'Registrá materias primas, envases y descartables con su unidad de medida y costo unitario actual.'
  },
  {
    number: '02',
    title: 'Armá la receta de tus productos',
    desc: 'Indicá las cantidades exactas que componen cada producto terminado para calcular su costo total de elaboración.'
  },
  {
    number: '03',
    title: 'Monitoreá y ajustá en vivo',
    desc: 'Si un proveedor aumenta sus precios, el sistema recalcula tus márgenes y te sugiere el precio de venta ideal.'
  }
]

const faqs = [
  {
    q: '¿Qué diferencia a MargenX de un sistema de facturación o punto de venta?',
    a: 'MargenX no gestiona tickets ni cobros de caja. Se enfoca exclusivamente en la ingeniería de costos: calcular cuánto te cuesta producir cada producto y proteger tu porcentaje de ganancia real frente a la inflación de insumos.'
  },
  {
    q: '¿Mis empleados pueden cargar costos sin ver cuánto gano?',
    a: 'Sí. MargenX cuenta con roles diferenciados: el rol Colaborador permite que el personal reciba mercadería y actualice precios de insumos, pero oculta completamente los márgenes y precios de venta del negocio.'
  },
  {
    q: '¿Sirve si mi comercio no es gastronómico?',
    a: 'Totalmente. MargenX está diseñado para cualquier comercio de manufactura, fraccionamiento o producción: panaderías, fábricas de productos de limpieza, pastelerías, cervecerías y talleres artesanales.'
  }
]

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      aria-label="Cambiar tema"
    >
      {dark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600 dark:text-slate-300" />}
    </button>
  )
}

export default function LandingPage() {
  const [menu, setMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      {/* NAVBAR */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="MargenX Inicio">
          <img
            src="/logo.png"
            alt="MargenX"
            className="h-10 w-auto object-contain md:h-12 dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Links Desktop */}
        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
          <a href="#producto" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Producto
          </a>
          <a href="#como-funciona" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Cómo funciona
          </a>
          <a href="#beneficios" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Beneficios
          </a>
          <a href="#rubros" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Para quién
          </a>
          <a href="#faq" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Preguntas
          </a>
        </div>

        {/* Botones Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-bold text-slate-700 transition hover:text-indigo-600 dark:text-slate-200 dark:hover:text-white"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            Probar demo
          </Link>
        </div>

        {/* Controles Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 dark:text-slate-200"
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </nav>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      {menu && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 md:hidden animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-4 text-base font-semibold">
            <a href="#producto" onClick={() => setMenu(false)} className="py-1">
              Producto
            </a>
            <a href="#como-funciona" onClick={() => setMenu(false)} className="py-1">
              Cómo funciona
            </a>
            <a href="#beneficios" onClick={() => setMenu(false)} className="py-1">
              Beneficios
            </a>
            <a href="#rubros" onClick={() => setMenu(false)} className="py-1">
              Para quién
            </a>
            <a href="#faq" onClick={() => setMenu(false)} className="py-1">
              Preguntas frecuentes
            </a>
            <hr className="border-slate-100 dark:border-slate-800 my-1" />
            <Link
              href="/login"
              onClick={() => setMenu(false)}
              className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md"
            >
              Iniciar sesión / Probar demo
            </Link>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="producto" className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Sparkles className="size-3.5" /> Software B2B de Control de Márgenes
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-7xl">
            Vende más. <span className="text-indigo-600">Gana mejor.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
            La plataforma simple para comercios productivos que calcula tus costos en vivo, alerta desvíos ante la suba de insumos y fija precios rentables.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700"
            >
              Empezar ahora <ArrowRight className="size-4" />
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <Play className="size-4 fill-current text-indigo-600" /> Ver cómo funciona
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-700" /> Sin tarjeta de crédito
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-700" /> Multiempresa
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-700" /> Web Mobile-First
            </span>
          </div>
        </div>

        {/* HERO MOCKUP CARD */}
        <div id="demo" className="relative">
          <div className="absolute -inset-6 rounded-[3rem] bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Panel de Control</p>
                <p className="mt-0.5 text-lg font-black">Monitoreo en tiempo real</p>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Catálogo Activo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
                <Boxes className="size-5 text-indigo-600 dark:text-indigo-400" />
                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Insumos activos</p>
                <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-100">18</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
                <BarChart3 className="size-5 text-emerald-700 dark:text-emerald-400" />
                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Margen promedio</p>
                <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">36.8%</p>
              </div>
            </div>

            {/* ALERTA EN VIVO MOCKUP */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-rose-950 dark:text-rose-100">Hamburguesa Doble</p>
                  <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">Costo: $1.380 · Precio: $1.600</p>
                </div>
                <span className="rounded-full bg-rose-200/70 px-2.5 py-1 text-xs font-black text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  13.8% ⚠️
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-rose-200 dark:bg-rose-900">
                <div className="h-1.5 w-[46%] rounded-full bg-rose-500" />
              </div>
              <p className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                Por debajo del margen mínimo objetivo (30%)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EN 3 PASOS */}
      <section id="como-funciona" className="border-t border-slate-200 bg-slate-100/70 px-5 py-16 dark:border-slate-800 dark:bg-slate-900/30 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">Flujo de Trabajo</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Cómo MargenX cuida tu dinero en 3 pasos</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-4xl font-black text-indigo-600/20 dark:text-indigo-400/20">{s.number}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="border-y border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-900/50 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">Todo bajo control</p>
          <h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-.04em] sm:text-4xl">
            La claridad que tu negocio necesita para crecer sin perder margen.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map(([Icon, title, text]) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-6 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RUBROS / PARA QUIÉN */}
      <section id="rubros" className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-white sm:p-12 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Diseñado para PyMEs Productivas</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Adaptado a cualquier proceso de elaboración.</h2>
            <p className="mt-3 text-sm text-slate-300">
              No importa si costeás por gramos, litros, mililitros o unidades: MargenX modela tu receta exacta.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0">
            {[
              '🥐 Panaderías y Pastelerías',
              '🧪 Químicas y Artículos de Limpieza',
              '🍔 Gastronomía y Food Trucks',
              '🏭 Fábricas y Producción Artesanal'
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-200 border border-slate-800">
                <Check className="size-4 text-indigo-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="border-t border-slate-200 bg-white px-5 py-16 dark:border-slate-800 dark:bg-slate-900/40 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">Dudas Comunes</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Preguntas frecuentes</h2>
          </div>
          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 transition dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 dark:text-slate-100"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`size-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm leading-6 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 py-20 text-center">
        <h2 className="text-4xl font-black tracking-[-.06em] sm:text-5xl">
          Tus precios merecen<br />
          <span className="text-indigo-600">mejores decisiones.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-slate-500 dark:text-slate-400">
          Dejá de operar a margen ciego. Probá MargenX hoy mismo.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          Entrar a MargenX <ArrowRight className="size-5" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
        © 2026 MargenX — Software B2B de Control de Márgenes en Tiempo Real.
      </footer>
    </main>
  )
}