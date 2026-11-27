'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Bell, Building2, Clock, LoaderCircle, LogOut, Save, ShieldCheck, Target } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { SupportDocsModal } from '@/components/support-docs-modal'
import { LogoutDialog } from '@/components/logout-dialog'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { CANONICAL_FOCUS_CLASSES } from '@/lib/accessibility'
import { USER_MANUAL_URL } from '@/lib/userManual'
import { authService } from '@/services/authService'
import { ApiError } from '@/services/api'
import { useSignOut } from '@/hooks/useSignOut'
import { NumericInput } from '@/components/NumericInput'
import { ToastAlert } from '@/components/ToastAlert'
import { useToast } from '@/hooks/useToast'
import { CollaboratorsSection } from '@/components/collaborators-section'
import { WeeklyReportDownload } from '@/components/weekly-report-download'
import { EmailText } from '@/components/email-text'
import { cn } from '@/lib/utils'

const profileTitle = 'Perfil y Configuración'

export default function ProfilePage() {
  const { getToken } = useAuth()
  const { user, businessName, defaultMinMarginPercent, isLoading, refreshUser } = useCurrentUser()

  const [customMargin, setCustomMargin] = useState<string | null>(null)
  const [isSavingGlobalMargin, setIsSavingGlobalMargin] = useState<boolean>(false)
  const { toast, notify, dismiss: dismissToast } = useToast()
  const [marginError, setMarginError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const isCollaborator = user?.role === 'COLLABORATOR'
  const roleLabel = isCollaborator ? 'COLABORADOR' : 'ADMINISTRADOR'
  const roleShort = isCollaborator ? 'CL' : 'AD'

  const currentMarginValue =
    customMargin !== null ? customMargin : String(defaultMinMarginPercent ?? 30)

  const handleSaveGlobalMargin = async () => {
    setMarginError(null)
    const numericMargin = Number(currentMarginValue)

    if (isNaN(numericMargin) || currentMarginValue.trim() === '') {
      setMarginError('Ingresá un valor numérico válido.')
      return
    }

    if (numericMargin < 0 || numericMargin > 100) {
      setMarginError('El margen debe estar entre 0% y 100%.')
      return
    }

    try {
      setIsSavingGlobalMargin(true)
      await authService.updateGlobalMargin(getToken, numericMargin)
      if (refreshUser) {
        await refreshUser()
      }
      setCustomMargin(null)
      notify('Margen objetivo global actualizado correctamente')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo guardar el margen global.'
      setMarginError(msg)
      notify(msg, 'error')
    } finally {
      setIsSavingGlobalMargin(false)
    }
  }

  const handleConfirmSignOut = useSignOut()

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert key={toast.id} title={toast.title} type={toast.type} onClose={dismissToast} />}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title={profileTitle} titleMobileOnly />

          <h1 className="hidden text-2xl font-bold tracking-tight md:block md:text-3xl">
            {profileTitle}
          </h1>

          {/* El colaborador no ve Margen ni Alertas: con una sola columna no queda media pantalla vacía (#497). */}
          <div className={cn('grid grid-cols-1 gap-6', !isCollaborator && 'md:grid-cols-2')}>
            {/* Columna Izquierda: Usuario y Comercio con Skeletons */}
            <div className="space-y-6">
              <section className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-black text-white shadow-lg shadow-indigo-600/20">
                  {isLoading ? (
                    <div className="size-8 animate-pulse rounded-full bg-indigo-400" />
                  ) : (
                    roleShort
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {/* A 360 px la etiqueta del rol baja de renglón en vez de cortar el nombre con "…" (#497). */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {isLoading ? (
                      <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                    ) : (
                      <>
                        <h2 className="break-words font-bold text-lg">
                          {isCollaborator ? 'Colaborador' : 'Administrador'}
                        </h2>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {roleLabel}
                        </span>
                      </>
                    )}
                  </div>
                  {isLoading ? (
                    <div className="mt-1.5 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
                  ) : (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {user?.email ? <EmailText email={user.email} /> : null}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="size-5 text-indigo-600" />
                  <h3 className="font-bold text-sm">Empresa / Comercio</h3>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div>
                    {isLoading ? (
                      <div className="h-5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    ) : (
                      <p className="font-bold text-base">{businessName}</p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Plan Profesional • Activo</p>
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    PRO
                  </span>
                </div>
              </section>

              {/* Equipo junto a la empresa: cuenta y organización a la izquierda, reglas del negocio a la derecha */}
              {!isCollaborator && !isLoading && <CollaboratorsSection onNotify={notify} />}
            </div>

            {!isCollaborator && (
              <div className="space-y-6">
                <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="size-5 text-indigo-600" />
                    <h3 className="font-bold text-sm">Margen Objetivo Global</h3>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Es el margen que te sugerimos al crear un producto nuevo. Cada producto tiene su propio mínimo, y las alertas usan ese mínimo.
                  </p>

                  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800 focus-within:border-indigo-600">
                    <span className="text-sm font-bold">Margen Mínimo Sugerido</span>
                    <NumericInput
                      aria-label="Margen Mínimo Sugerido"
                      value={currentMarginValue}
                      onChange={setCustomMargin}
                      suffixSymbol="%"
                      suffixClassName="font-bold text-sm text-gray-500 dark:text-gray-400"
                      disabled={isSavingGlobalMargin}
                      containerClassName="w-24 border-none bg-transparent px-0 focus-within:ring-0 focus-within:border-transparent dark:bg-transparent"
                      className="text-right font-black text-xl text-indigo-600 disabled:opacity-50 dark:text-indigo-400"
                    />
                  </div>

                  {marginError && (
                    <p className="text-xs font-bold text-rose-500">{marginError}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveGlobalMargin}
                    disabled={isSavingGlobalMargin || user?.role !== 'ADMIN'}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingGlobalMargin ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isSavingGlobalMargin ? 'Guardando Margen...' : 'Guardar Margen'}
                  </button>
                </section>

                <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="size-5 text-indigo-600" />
                    <h3 className="font-bold text-sm">Alertas automáticas</h3>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Alerta de margen mínimo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Aviso inmediato por email cuando un producto queda por debajo de tu margen mínimo</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      Activa
                    </span>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {/* En pantallas angostas el badge baja debajo del texto: no entra al lado sin partir el título. */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="whitespace-nowrap text-sm font-semibold">Reporte Semanal en PDF</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Te llega por email con el PDF de los últimos 7 días</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Clock className="size-3.5" aria-hidden="true" />
                        Activo · lunes 08:00
                      </span>
                    </div>
                    {/* Solo ADMIN, y no antes de conocer el rol: la API responde 403 a un colaborador. */}
                    {!isLoading && user?.role === 'ADMIN' && <WeeklyReportDownload variant="link" />}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Las alertas por email se envían automáticamente al administrador cuando cambia el costo de un insumo.
                  </p>
                </section>

              </div>
            )}
          </div>

          {/* Sin accesos duplicados (#429): Política e Instalación están en el pie (el móvil de abajo
              y el DesktopFooter); Cerrar sesión, en el celular acá y en escritorio en "Salir" del navbar. */}
          <div className="pt-2 md:hidden">
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 py-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100/60 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950 md:hidden"
            >
              <LogOut className="size-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Footer Móvil de Perfil */}
        <div className="mt-8 flex flex-col items-center gap-4 pb-8 md:hidden">
          <div className="flex items-center gap-6 text-sm font-semibold text-gray-500 dark:text-gray-400">
            <Link to="/privacidad" className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">Política</Link>
            <Link to="/instalar" className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">Instalar</Link>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className={`cursor-pointer rounded hover:text-indigo-600 dark:hover:text-indigo-400 ${CANONICAL_FOCUS_CLASSES}`}
            >
              Soporte
            </button>
            <a
              href={USER_MANUAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded hover:text-indigo-600 dark:hover:text-indigo-400 ${CANONICAL_FOCUS_CLASSES}`}
            >
              Documentación<span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            Sistemas en línea
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} MargenX</p>
        </div>

        <DesktopFooter />
      </div>

      <BottomNav />
      <SupportDocsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <LogoutDialog
        open={showLogoutModal}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowLogoutModal(false)}
      />
    </main>
  )
}