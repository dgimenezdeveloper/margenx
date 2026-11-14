import { useEffect, useState } from 'react'
import { X, History, TrendingUp, TrendingDown, Minus, LoaderCircle } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import { ingredientService, type PriceHistory } from '@/services/ingredientService'
import { EmptyState } from '@/components/empty-state'
import { Dialog, DialogPortal, DialogBackdrop, DialogSheet, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { formatMoney, formatPercent } from '@/lib/format'

interface PriceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  ingredientId: string
  ingredientName: string
}

const money = (val: number) => formatMoney(val)

const formatDate = (isoString: string) => {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date)
}

export function PriceHistoryModal({ isOpen, onClose, ingredientId, ingredientName }: PriceHistoryModalProps) {
  const { getToken } = useAuth()
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !ingredientId) return

    let active = true

    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await ingredientService.getHistory(getToken, ingredientId)
        if (active) setHistory(data)
      } catch {
        if (active) setError('No se pudo cargar el historial de precios.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void fetchHistory()

    return () => {
      active = false
    }
  }, [isOpen, ingredientId, getToken])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPortal>
        <DialogBackdrop className="z-70" />
        <DialogSheet className="z-70 flex flex-col max-h-[85vh]">
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-gray-200 md:hidden dark:bg-gray-700" />

          <div className="flex shrink-0 items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Historial de Costos</p>
              <DialogTitle className="mt-1 truncate max-w-62.5 sm:max-w-75">
                {ingredientName}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Variaciones registradas en el costo unitario de {ingredientName}.
              </DialogDescription>
            </div>
            <DialogClose aria-label="Cerrar historial de costos" className="flex size-10 min-h-11 min-w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition cursor-pointer">
              <X className="size-5" />
            </DialogClose>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                <p className="text-sm font-semibold">Cargando historial...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 text-center">
                {error}
              </div>
            ) : history.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={<History className="size-6" />}
                  title="Sin variaciones registradas"
                  description="Este insumo aún no ha sufrido cambios en su costo unitario."
                />
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-100 dark:border-gray-800 ml-3 space-y-6 py-4">
                {history.map((entry) => {
                  const percentChange = entry.oldCost > 0
                    ? ((entry.newCost - entry.oldCost) / entry.oldCost) * 100
                    : 100

                  const isIncrease = percentChange > 0
                  const isDecrease = percentChange < 0
                  const formattedPercent = formatPercent(percentChange, { signed: true })

                  return (
                    <div key={entry.id} className="relative pl-6">
                      <div className="absolute -left-2.25 top-1 flex size-4 items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-4 ring-white dark:ring-gray-900">
                        <div className="size-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                          {formatDate(entry.changedAt)}
                        </span>

                        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Anterior</span>
                            <span className="text-sm font-semibold text-gray-500 line-through dark:text-gray-400">
                              {money(entry.oldCost)}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase text-gray-400">Nuevo</span>
                            <span className="text-base font-black text-gray-900 dark:text-white">
                              {money(entry.newCost)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 flex justify-end">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isIncrease
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                : isDecrease
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {isIncrease ? (
                              <TrendingUp className="size-3" />
                            ) : isDecrease ? (
                              <TrendingDown className="size-3" />
                            ) : (
                              <Minus className="size-3" />
                            )}
                            {formattedPercent}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogSheet>
      </DialogPortal>
    </Dialog>
  )
}
