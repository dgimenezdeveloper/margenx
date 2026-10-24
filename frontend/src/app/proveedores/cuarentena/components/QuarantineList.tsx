import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Check, X, AlertTriangle, LoaderCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { QuarantinedItem } from '@/services/supplierService'
import { supplierService } from '@/services/supplierService'
import { useQuarantineStore } from '@/stores/useQuarantineStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

const money = (val: number) =>
  `$${Number(val).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface QuarantineListProps {
  items: QuarantinedItem[]
  onShowToast: (msg: string, type: 'success' | 'error') => void
}

export function QuarantineList({ items, onShowToast }: QuarantineListProps) {
  const { getToken } = useAuth()
  const { removeItemLocally } = useQuarantineStore()

  const [selectedItem, setSelectedItem] = useState<QuarantinedItem | null>(null)
  const [actionType, setActionType] = useState<'release' | 'reject' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useBodyScrollLock(selectedItem !== null)

  const handleAction = async () => {
    if (!selectedItem || !actionType) return
    setIsProcessing(true)
    try {
      if (actionType === 'release') {
        const res = await supplierService.releaseQuarantine(getToken, selectedItem.id)
        onShowToast(
          `Precio liberado. Recálculo: ${res.affectedProductsCount} afectados, ${res.criticalProducts.length} críticos.`,
          'success'
        )
      } else {
        await supplierService.rejectQuarantine(getToken, selectedItem.id)
        onShowToast('Precio rechazado. Se mantiene el costo anterior.', 'success')
      }
      removeItemLocally(selectedItem.id)
      setSelectedItem(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la acción'
      onShowToast(msg, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const getVariationData = (item: QuarantinedItem) => {
    const size = Number(item.packageSize) || 1
    const currentPrice = Number(item.currentPrice ?? item.packagePrice)
    const proposedPrice = Number(item.proposedPrice ?? item.packagePrice)

    const actual = currentPrice / size
    const proposed = proposedPrice / size
    const diff = proposed - actual
    const percent = actual > 0 ? (diff / actual) * 100 : 0
    const isIncrease = percent >= 0

    let reason = 'Variación anormal'
    if (item.quarantineReason === 'COSTO_UNITARIO_INSUFICIENTE' || proposed <= 0.01) {
      reason = 'Costo casi nulo'
    } else if (item.quarantineReason === 'VARIACION_MAYOR_50_POR_CIENTO') {
      reason = isIncrease ? 'Aumento > 50%' : 'Caída > 50%'
    } else if (item.quarantineReason) {
      reason = item.quarantineReason
    } else if (percent > 50) {
      reason = 'Aumento > 50%'
    } else if (percent < -50) {
      reason = 'Caída > 50%'
    }

    return { actual, proposed, percent, reason, isIncrease }
  }

  return (
    <div className="space-y-4">
      {/* MOBILE CARDS */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {items.map((item) => {
          const { actual, proposed, percent, reason, isIncrease } = getVariationData(item)
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-900/50 dark:bg-gray-900"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{item.ingredient.name}</h3>
                  <p className="text-xs text-gray-500">{item.supplier.name}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {reason}
                </span>
              </div>

              <div className="my-3 grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Actual</p>
                  <p className="font-semibold text-gray-600 line-through dark:text-gray-400">
                    {money(actual)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Propuesto</p>
                  <p className="font-black text-gray-900 dark:text-white">{money(proposed)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${
                    isIncrease ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {isIncrease ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {percent > 0 ? '+' : ''}
                  {percent.toFixed(1)}%
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item)
                      setActionType('reject')
                    }}
                    aria-label={`Rechazar precio propuesto para ${item.ingredient.name}`}
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer transition"
                  >
                    <X className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(item)
                      setActionType('release')
                    }}
                    aria-label={`Liberar precio propuesto para ${item.ingredient.name}`}
                    className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700 shadow-sm cursor-pointer transition"
                  >
                    <Check className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-100">
            <tr>
              <th className="px-4 py-3 font-bold">Insumo / Proveedor</th>
              <th className="px-4 py-3 font-bold">Actual</th>
              <th className="px-4 py-3 font-bold">Propuesto</th>
              <th className="px-4 py-3 font-bold">Variación</th>
              <th className="px-4 py-3 font-bold">Motivo</th>
              <th className="px-4 py-3 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => {
              const { actual, proposed, percent, reason, isIncrease } = getVariationData(item)
              return (
                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900 dark:text-white">{item.ingredient.name}</p>
                    <p className="text-xs text-gray-500">{item.supplier.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 line-through">{money(actual)}</td>
                  <td className="px-4 py-3 font-black text-gray-900 dark:text-white">{money(proposed)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        isIncrease
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                      }`}
                    >
                      {isIncrease ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {percent > 0 ? '+' : ''}
                      {percent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      {reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item)
                          setActionType('reject')
                        }}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer transition"
                      >
                        <X className="size-3.5" /> Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItem(item)
                          setActionType('release')
                        }}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm cursor-pointer transition"
                      >
                        <Check className="size-3.5" /> Liberar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {selectedItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => !isProcessing && setSelectedItem(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900 animate-in zoom-in-95 duration-200">
            <div
              className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${
                actionType === 'release'
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
              }`}
            >
              {actionType === 'release' ? <Check className="size-7" /> : <AlertTriangle className="size-7" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {actionType === 'release' ? '¿Liberar precio?' : '¿Rechazar precio?'}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {actionType === 'release'
                ? selectedItem.isDefault
                  ? `El costo de ${selectedItem.ingredient.name} se actualizará y recalculará las recetas afectadas.`
                  : `Se actualizará la presentación de ${selectedItem.ingredient.name}. No afectará las recetas porque no es el proveedor predeterminado.`
                : `El precio anómalo será descartado y ${selectedItem.ingredient.name} mantendrá su costo actual.`}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setSelectedItem(null)}
                className="min-h-11 flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleAction}
                className={`min-h-11 flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 transition ${
                  actionType === 'release' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessing && <LoaderCircle className="size-4 animate-spin" />}
                {actionType === 'release' ? 'Sí, liberar' : 'Sí, rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}