'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Lock,
  Mail,
  Menu,
  Moon,
  Play,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Truck,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'

const benefits = [
  [
    Target,
    'Decisiones con rentabilidad real',
    'Fijá tus precios de venta con base en el costo exacto de tus recetas (Medialunas, Pan flauta o Detergente), eliminando estimaciones al tanteo.',
  ],
  [
    RefreshCw,
    'Recálculo automático en cascada',
    'Cuando sube el precio de una materia prima clave (harina, manteca, etoxilado o soda cáustica), todos los productos que la contienen se actualizan al instante.',
  ],
  [
    ShieldCheck,
    'Alertas antes de perder dinero',
    'Semáforo visual en pantalla y notificaciones automáticas vía email en cuanto un producto cae por debajo de su margen mínimo esperado.',
  ],
] as const

const steps = [
  {
    number: '01',
    title: 'Cargá tus insumos o bultos',
    desc: 'Registrá materias primas en kg, litros o unidades. Si comprás por bulto cerrado (ej. bolsa de 25 kg), el sistema calcula el costo unitario exacto.',
  },
  {
    number: '02',
    title: 'Definí tus recetas técnicas',
    desc: 'Indicá las cantidades exactas por tanda o unidad elaborada (Panadería Central o Química GyJ) para liquidar el costo total sin errores de punto flotante.',
  },
  {
    number: '03',
    title: 'Monitoreá y ajustá en vivo',
    desc: 'Reenviá las listas del distribuidor o cargá nuevos costos: el motor recalcula tus márgenes y te sugiere el precio de venta ideal para proteger tu ganancia.',
  },
]

const faqs = [
  {
    q: '¿Qué diferencia a MargenX de un sistema de facturación o punto de venta?',
    a: 'MargenX no gestiona tickets ni cobros de caja. Se enfoca exclusivamente en la ingeniería de costos: calcular cuánto te cuesta producir cada producto y proteger tu porcentaje de ganancia real frente a la inflación de insumos.',
  },
  {
    q: '¿Cómo funciona la ingesta de precios desatendida "Zero-Click"?',
    a: 'Cada comercio registrado recibe un alias virtual único (ej. precios+panaderia-central@margenx.tech). Al recibir un correo o WhatsApp de un distribuidor con un archivo Excel o CSV, simplemente lo reenviás a esa casilla. Nuestro satélite lee el archivo, actualiza en segundo plano los artículos vinculados y descarta el resto sin contaminar tu catálogo.',
  },
  {
    q: '¿Mis colaboradores pueden ver cuánto gano o el costo de las recetas?',
    a: 'No. El rol Colaborador está sanitizado server-side a nivel de API: el personal en salón o mostrador solo puede consultar los nombres de los productos y sus precios de venta vigentes para atender y cobrar al público, manteniendo los márgenes, costos y proveedores totalmente confidenciales.',
  },
  {
    q: '¿Cómo resuelve MargenX las compras por bulto mayorista?',
    a: 'A través de la Calculadora de Empaques integrada. Si tu proveedor te vende una bolsa de 25 kg de harina a $18.000, MargenX calcula automáticamente $720,00/kg con precisión bancaria Prisma.Decimal y redondeo oficial ROUND_HALF_UP.',
  },
]

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex cursor-pointer size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950"
      aria-label="Cambiar tema de color"
    >
      {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600 dark:text-slate-300" />}
    </button>
  )
}

export default function LandingPage() {
  const [menu, setMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activePilot, setActivePilot] = useState<'panaderia' | 'quimica'>('panaderia')

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      {/* NAVBAR */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-5 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="MargenX Inicio">
          <img
            src="/logo.png"
            alt="MargenX"
            className="h-10 w-auto object-contain md:h-12 dark:brightness-0 dark:invert"
          />
        </Link>

        {/* Links Desktop */}
        <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300 md:flex">
          <a href="#producto" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Producto
          </a>
          <a href="#diferencial" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Valor diferencial
          </a>
          <a href="#como-funciona" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Cómo funciona
          </a>
          <a href="#rubros" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
            Casos piloto
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
            className="px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:text-indigo-600 dark:text-slate-200 dark:hover:text-white"
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
            className="rounded-lg p-2 text-slate-700 dark:text-slate-200 cursor-pointer"
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
            <a href="#diferencial" onClick={() => setMenu(false)} className="py-1">
              Valor diferencial
            </a>
            <a href="#como-funciona" onClick={() => setMenu(false)} className="py-1">
              Cómo funciona
            </a>
            <a href="#rubros" onClick={() => setMenu(false)} className="py-1">
              Casos piloto
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
      <section id="producto" className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-5 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-24 lg:pt-14">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Sparkles className="size-3.5" /> Casos Reales: Panadería Central & Química GyJ
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.02] tracking-tighter sm:text-6xl lg:text-7xl">
            Control de costos <span className="text-indigo-600">en tiempo real.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300">
            La plataforma de precisión financiera para comercios de manufactura y panificados. Recalcula márgenes ante subas de insumos, ingiere listas por correo y oculta datos sensibles en salón.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700 cursor-pointer"
            >
              Ingresar al sistema <ArrowRight className="size-4" />
            </Link>
            <a
              href="#diferencial"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
            >
              <Play className="size-4 fill-current text-indigo-600" /> Ver innovaciones
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> Aislamiento multi-tenant
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> RBAC estricto
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" /> Mobile-First (360px)
            </span>
          </div>
        </div>

        {/* HERO MOCKUP INTERACTIVO CON DATOS REALES DEL SEED */}
        <div id="demo" className="relative">
          <div className="absolute -inset-4 rounded-[3rem] bg-indigo-500/10 blur-3xl dark:bg-indigo-600/15" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Catálogo en Vivo</p>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {activePilot === 'panaderia' ? 'Panadería Central' : 'Química GyJ'}
                </p>
              </div>

              {/* Selector de Comercio Piloto Real */}
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePilot('panaderia')}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    activePilot === 'panaderia'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  🥖 Panadería
                </button>
                <button
                  type="button"
                  onClick={() => setActivePilot('quimica')}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    activePilot === 'quimica'
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  🧪 Química
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
                <Boxes className="size-5 text-indigo-600 dark:text-indigo-400" />
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Materias primas</p>
                <p className="mt-1 text-2xl font-black text-indigo-950 dark:text-indigo-100">10 insumos</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
                <BarChart3 className="size-5 text-emerald-700 dark:text-emerald-400" />
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Margen promedio</p>
                <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">
                  {activePilot === 'panaderia' ? '60.6%' : '40.8%'}
                </p>
              </div>
            </div>

            {/* Ficha 1: Caso Saludable Real (Datos de Seed verificados) */}
            <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    {activePilot === 'panaderia'
                      ? 'Medialunas de manteca (Docena)'
                      : 'Detergente (Magistral) — 1 L'}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                    {activePilot === 'panaderia'
                      ? 'Costo: $3.616,25 · Precio: $13.500'
                      : 'Costo: $316,30 · Precio: $650'}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-200/80 px-2.5 py-1 text-xs font-black text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                  {activePilot === 'panaderia' ? '73,2% Saludable' : '51,3% Saludable'}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {activePilot === 'panaderia'
                  ? 'Supera el umbral mínimo configurado (65,0%)'
                  : 'Supera el umbral mínimo configurado (35,0%)'}
              </p>
            </div>

            {/* Ficha 2: Segundo Producto Real (Bizcochitos Saludable / Suavizante Crítico) */}
            <div
              className={`rounded-2xl border p-3.5 ${
                activePilot === 'panaderia'
                  ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                  : 'border-rose-200 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p
                    className={`text-sm font-bold ${
                      activePilot === 'panaderia'
                        ? 'text-emerald-950 dark:text-emerald-100'
                        : 'text-rose-950 dark:text-rose-100'
                    }`}
                  >
                    {activePilot === 'panaderia'
                      ? 'Bizcochitos de grasa — 1 kg'
                      : 'Suavizante (Vivere / Johnson) — 1 L'}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      activePilot === 'panaderia'
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : 'text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {activePilot === 'panaderia'
                      ? 'Costo: $1.662,69 · Precio: $3.200'
                      : 'Costo: $539,28 · Precio: $750'}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                    activePilot === 'panaderia'
                      ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200'
                      : 'bg-rose-200/80 text-rose-900 dark:bg-rose-900/80 dark:text-rose-200'
                  }`}
                >
                  {activePilot === 'quimica' && <AlertTriangle className="size-3" />}
                  {activePilot === 'panaderia' ? '48,0% Saludable' : '28,1% Crítico'}
                </span>
              </div>
              <p
                className={`mt-2 text-[11px] font-semibold ${
                  activePilot === 'panaderia'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-rose-800 dark:text-rose-300'
                }`}
              >
                {activePilot === 'panaderia'
                  ? 'Cumple y supera el umbral mínimo configurado (40,0%)'
                  : 'Por debajo del umbral mínimo configurado (40,0%)'}
              </p>
            </div>

            <p className="mt-3 text-[10px] text-center text-slate-400 dark:text-slate-500">
              * Costos unitarios y márgenes liquidados con Prisma.Decimal contra el dataset oficial de producción (seed post-#178).
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE VALOR DIFERENCIAL (3 PILARES CLAVE) */}
      <section id="diferencial" className="border-t border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-900/70 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
              Valor Diferencial
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl text-slate-900 dark:text-white">
              Automatización e higiene de datos pensadas para la PyME real
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              No obligamos al dueño a pasar facturas a mano ni exponemos la ganancia neta en la caja registradora.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Pilar 1: Ingesta Zero-Click */}
            <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    <Mail className="size-5" />
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                    Zero-Click n8n
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ingesta automática por correo
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Reenviá la lista que te envía el molino o mayorista a tu dirección virtual propia:
                </p>
                <div className="mt-3 rounded-xl border border-indigo-200 bg-white p-2.5 font-mono text-[11px] font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-slate-900 dark:text-indigo-300 break-all">
                  precios+panaderia-central@margenx.tech
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <FileSpreadsheet className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <p>
                    <strong>Filtro Anti-Polución:</strong> Si el proveedor envía 5.000 filas, MargenX actualiza únicamente tus materias primas mapeadas y descarta el resto sin ensuciar la base.
                  </p>
                </div>
              </div>
            </article>

            {/* Pilar 2: Seguridad RBAC */}
            <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                    <Users className="size-5" />
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                    Seguridad RBAC
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Doble capa de control de roles
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  Protección estricta validada tanto en la interfaz como en el middleware de Express:
                </p>
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Eye className="size-3.5" /> Dueño (Admin)
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Ve margen real (73,2%)</span>
                  </div>
                  <hr className="border-slate-100 dark:border-slate-800" />
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <EyeOff className="size-3.5" /> Colaborador (Caja)
                    </span>
                    <span className="text-[11px] text-slate-500">Solo precio al público ($13.500)</span>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p>
                    Costos de materia prima, proveedores y rentabilidad neta están censurados en la red y en el DOM.
                  </p>
                </div>
              </div>
            </article>

            {/* Pilar 3: Calculadora Mayorista */}
            <article className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                    <Scale className="size-5" />
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                    Multi-Proveedor
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Calculadora de empaques mayoristas
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
                  El mayorista vende por bulto cerrado; tus recetas pesan en gramos o mililitros:
                </p>
                <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3 text-xs dark:border-emerald-900/60 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Bulto Distribuidora:</span>
                    <strong className="text-slate-700 dark:text-slate-300">Bolsa 25 kg @ $18.000</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400">Costo unitario receta:</span>
                    <strong className="text-sm font-black text-emerald-700 dark:text-emerald-300">$720,00 / kg</strong>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Truck className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <p>
                    Asociá múltiples presentaciones por insumo y conmutá el proveedor predeterminado con recálculo automático.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="border-t border-slate-200 bg-slate-100/70 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/30 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
              Flujo de Trabajo
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl text-slate-900 dark:text-white">
              Cálculo financiero simple en 3 pasos
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-4xl font-black text-indigo-600/20 dark:text-indigo-400/20">{s.number}</span>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="border-y border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-900/50 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
            Control Financiero
          </p>
          <h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-.04em] sm:text-4xl text-slate-900 dark:text-white">
            La claridad que tu comercio necesita para no licuar su margen.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map(([Icon, title, text]) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-6 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RUBROS / CASOS REALES PILOTO */}
      <section id="rubros" className="mx-auto max-w-6xl px-4 py-16 sm:px-5 lg:px-8">
        <div className="rounded-3xl border bg-white border-slate-200 dark:border-slate-800 dark:bg-slate-900/40 p-6 sm:p-12 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Validado con Comercios Reales
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em]">
              Adaptado a la realidad del mostrador y el taller
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Desarrollado y probado junto a <strong>Panadería Central</strong> y <strong>Química GyJ</strong> para soportar unidades fraccionarias, conversión de empaques y resguardo de datos en salón.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0">
            {[
              '🥐 Panadería Central: Harina, manteca y recetas de docena',
              '🧪 Química GyJ: Sulfónico, etoxilado y bidones de 1L/5L',
              '🍰 Pastelerías y elaboración artesanal por peso/volumen',
              '🧼 Elaboración y fraccionamiento químico barrial',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm font-semibold border border-slate-200 dark:border-slate-800 dark:text-white">
                <Check className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="border-t border-slate-200 bg-white px-4 py-16 dark:border-slate-800 dark:bg-slate-900/40 sm:px-5 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-400">
              Dudas Comunes
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-900 dark:text-white">
              Preguntas frecuentes
            </h2>
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
                    className="flex cursor-pointer w-full items-center justify-between p-5 text-left text-sm font-bold text-slate-900 dark:text-slate-100"
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
      <section className="px-4 py-20 text-center sm:px-5">
        <h2 className="text-4xl font-black tracking-[-.06em] sm:text-5xl text-slate-900 dark:text-white">
          Tus costos merecen<br />
          <span className="text-indigo-600">decisiones con margen real.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Dejá de operar a margen ciego. Probá la demo de MargenX con datos reales de comercios piloto.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/25 transition hover:bg-indigo-700 cursor-pointer"
        >
          Probar demo en vivo <ArrowRight className="size-5" />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © 2026 MargenX — Software B2B de Control de Márgenes en Tiempo Real (Panadería Central & Química GyJ).
      </footer>
    </main>
  )
}