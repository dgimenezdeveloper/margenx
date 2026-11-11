import { useId, useRef, useState } from 'react'
import { NumericInput } from '@/components/NumericInput'
import { formatNumeroAR } from '@/lib/numericFormat'
import { checkRecipeQuantity, type RecipeQuantityCheck } from '@/lib/recipeConversion'

const fmt = (value: number) => formatNumeroAR(value, 3)

export interface RecipeQuantityFieldProps {
  ingredientName: string
  /** Cantidad vigente de la línea, en la unidad de receta. */
  value: number
  recipeUnit: string
  /** Unidad del insumo, en la que la base guarda la cantidad. */
  baseUnit: string
  onChange: (inputQty: number, baseQty: number) => void
}

/**
 * Campo de cantidad de una línea de receta (edición en la lista).
 * Aplica las mismas reglas que el modal de agregar insumo y, además, garantiza que lo que se ve
 * es lo que se guarda: avisa cuando la cantidad se redondea o no se puede guardar y, al salir
 * del campo, muestra la cantidad que quedó en la receta.
 */
export function RecipeQuantityField({ ingredientName, value, recipeUnit, baseUnit, onChange }: RecipeQuantityFieldProps) {
  const noticeId = useId()
  const [notice, setNotice] = useState<string | null>(null)
  // Cambiar la key vuelve a montar el campo con la cantidad vigente de la línea
  const [resetKey, setResetKey] = useState(0)
  const lastStatusRef = useRef<RecipeQuantityCheck['status']>('ok')

  const current = `${fmt(value)} ${recipeUnit}`

  const handleChange = (raw: string) => {
    const check = checkRecipeQuantity(raw, recipeUnit, baseUnit)
    lastStatusRef.current = check.status

    // Campo vacío o en cero mientras se escribe: se resuelve al salir del campo
    if (check.status === 'invalid') return

    if (check.status === 'belowMinimum') {
      setNotice(`⚠️ Es menor al mínimo que se puede guardar (0,001 ${baseUnit}). Se mantiene ${current}.`)
      return
    }

    onChange(check.inputQty, check.baseQty)

    if (check.status === 'rounded') {
      const equivalent = recipeUnit === baseUnit ? '' : ` (${fmt(check.baseQty)} ${baseUnit})`
      setNotice(`⚠️ Se guarda como ${fmt(check.inputQty)} ${recipeUnit}${equivalent}: hasta 3 decimales en ${baseUnit}.`)
    } else {
      setNotice(null)
    }
  }

  const handleBlur = () => {
    const status = lastStatusRef.current
    lastStatusRef.current = 'ok'
    if (status === 'ok') return

    if (status === 'invalid') {
      setNotice(`⚠️ La cantidad debe ser mayor a cero. Se mantiene ${current}.`)
    }
    setResetKey((key) => key + 1)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/60 bg-gray-100 px-2 py-1 dark:border-gray-700/60 dark:bg-gray-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <NumericInput
          key={resetKey}
          aria-label={`Cantidad de ${ingredientName}`}
          aria-describedby={notice ? noticeId : undefined}
          value={value}
          maxDecimals={3}
          onChange={handleChange}
          onBlur={handleBlur}
          containerClassName="min-h-11 h-11 w-16 border-none bg-transparent px-1 focus-within:ring-0 dark:bg-transparent"
          className="text-xs font-black text-gray-900 dark:text-gray-100 text-right"
        />
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-6">{recipeUnit}</span>
      </div>
      <p
        id={noticeId}
        role="status"
        aria-live="polite"
        className="max-w-[9rem] text-right text-[10px] font-bold text-amber-700 empty:hidden dark:text-amber-400"
      >
        {notice}
      </p>
    </div>
  )
}
