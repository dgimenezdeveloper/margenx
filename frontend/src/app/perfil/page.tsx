'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, Building2, LogOut, Target } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'

const profileTitle = 'Perfil y Configuración'

// Componente Toggle Switch estándar con proporción fija inmune a deformaciones
function ToggleSwitch({
  checked,
  onChange,
  ariaLabel
}: {
  checked: boolean
  onChange: (value: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function ProfilePage() {
  const [companyName] = useState('Hamburguesería')
  const [globalMargin, setGlobalMargin] = useState('30')
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title={profileTitle} titleMobileOnly />

          <h1 className="hidden text-2xl font-bold tracking-tight md:block md:text-3xl">
            {profileTitle}
          </h1>

          {/* Grilla: 1 col en mobile, 2 cols en desktop */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* Columna Izquierda: Usuario y Comercio */}
            <div className="space-y-6">
              <section className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white shadow-lg shadow-indigo-600/20">
                  AD
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-bold text-lg">Administrador</h2>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      ADMIN
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500 mt-0.5">admin@comercio.com</p>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="size-5 text-indigo-600" />
                  <h3 className="font-bold text-sm">Empresa / Comercio</h3>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div>
                    <p className="font-bold text-base">{companyName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Plan Profesional • Activo</p>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    PRO
                  </span>
                </div>
              </section>
            </div>

            {/* Columna Derecha: Margen y Alertas */}
            <div className="space-y-6">
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="size-5 text-indigo-600" />
                  <h3 className="font-bold text-sm">Margen Objetivo Global</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Los productos con margen menor a este porcentaje se marcarán automáticamente en rojo en el Dashboard.
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-sm font-bold">Margen Mínimo (%)</span>
                  <div className="flex items-center gap-1">
                    <input
                      value={globalMargin}
                      onChange={(e) => setGlobalMargin(e.target.value)}
                      inputMode="decimal"
                      type="number"
                      className="w-14 bg-transparent text-right font-black text-xl text-indigo-600 outline-none"
                    />
                    <span className="font-bold text-sm text-gray-400">%</span>
                  </div>
                </div>
              </section>

              {/* Automatizaciones n8n */}
              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="size-5 text-indigo-600" />
                  <h3 className="font-bold text-sm">Alertas Automáticas (n8n)</h3>
                </div>

                {/* 1. Alerta Crítica */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Alerta de Margen Crítico</p>
                    <p className="text-xs text-gray-500">Aviso inmediato por email cuando sube un insumo</p>
                  </div>
                  <ToggleSwitch
                    checked={emailAlerts}
                    onChange={setEmailAlerts}
                    ariaLabel="Alerta de Margen Crítico"
                  />
                </div>

                {/* 2. Reporte Semanal en PDF */}
                <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Reporte Semanal en PDF</p>
                    <p className="text-xs text-gray-500">Envío todos los lunes a las 08:00 hs</p>
                  </div>
                  <ToggleSwitch
                    checked={weeklyReport}
                    onChange={setWeeklyReport}
                    ariaLabel="Reporte Semanal en PDF"
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Cerrar Sesión */}
          <div className="pt-2 md:flex md:justify-end md:pt-6">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 py-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100/60 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 md:w-auto md:px-8"
            >
              <LogOut className="size-4" />
              Cerrar Sesión
            </Link>
          </div>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
    </main>
  )
}