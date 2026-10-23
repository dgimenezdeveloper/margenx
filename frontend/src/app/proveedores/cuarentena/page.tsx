'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { BottomNav } from '@/components/bottom-nav'
import { DesktopFooter } from '@/components/desktop-footer'
import { EmptyState } from '@/components/empty-state'
import { useQuarantineStore } from '@/stores/useQuarantineStore'
import { QuarantineList } from './components/QuarantineList'

export default function QuarantinePage() {
  const { getToken } = useAuth()
  const { items, isLoading, error, fetchItems } = useQuarantineStore()

  useEffect(() => {
    void fetchItems(getToken)
  }, [getToken, fetchItems])

  return (
    <main className="min-h-screen flex flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-5 md:max-w-5xl md:px-8 lg:max-w-6xl lg:px-12">
        <div className="flex flex-col gap-6 pb-28 md:pb-12">
          <Navbar title="Cuarentena de Precios" backHref="/insumos" />

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
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/30">
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-4">{error}</p>
                <button
                  onClick={() => fetchItems(getToken)}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 cursor-pointer"
                >
                  <RefreshCw className="size-4" /> Reintentar
                </button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="size-6" />}
                title="Bandeja limpia"
                description="No hay precios retenidos en cuarentena en este momento."
              />
            ) : (
              <QuarantineList items={items} />
            )}
          </section>
        </div>
        <DesktopFooter />
      </div>
      <BottomNav />
    </main>
  )
}