'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { ToastAlert } from '@/components/ToastAlert'
import { useQuarantineStore } from '@/stores/useQuarantineStore'
import { useToast } from '@/hooks/useToast'
import { SuppliersTabs } from '../components/SuppliersTabs'
import { QuarantineList } from './components/QuarantineList'

export default function QuarantinePage() {
  const { getToken } = useAuth()
  const { items, isLoading, error, fetchItems } = useQuarantineStore()
  const { toast, notify, dismiss: closeToast } = useToast()

  useEffect(() => {
    void fetchItems(getToken)
  }, [getToken, fetchItems])

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {toast && <ToastAlert key={toast.id} title={toast.title} type={toast.type} onClose={closeToast} />}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title="Cuarentena de Precios" backHref="/proveedores" />

          <SuppliersTabs active="quarantine" quarantineCount={isLoading || error ? undefined : items.length} />

          <section>
            <div className="mb-6">
              <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
                <ShieldAlert className="size-6 text-amber-500" />
                Precios en Cuarentena
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Revisa y decide sobre los precios retenidos por el filtro anti-polución debido a variaciones anormales.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-10 text-sm font-semibold text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <RefreshCw className="mr-2 size-5 animate-spin" /> Cargando bandeja...
              </div>
            ) : error ? (
              <ErrorState
                title="Error al cargar la cuarentena"
                description={error}
                onRetry={() => fetchItems(getToken)}
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="size-6" />}
                title="Bandeja limpia"
                description="No hay precios retenidos en cuarentena en este momento."
              />
            ) : (
              <QuarantineList items={items} onShowToast={notify} />
            )}
          </section>
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
    </main>
  )
}