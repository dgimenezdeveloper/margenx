// frontend/src/components/ToastAlert.tsx
import { Check, AlertTriangle, X, Info } from 'lucide-react'
import { useState, useRef } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAlertProps {
  title?: string
  message?: string
  description?: string
  type?: ToastType
  onClose?: () => void
  offset?: number
}

export function ToastAlert({
  title,
  message,
  description,
  type = 'success',
  onClose,
}: ToastAlertProps) {
  const displayTitle = title ?? message ?? ''

  // --- Lógica táctil Swipe-to-Dismiss para Mobile ---
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current === null) return
    const currentX = e.touches[0].clientX
    const diff = currentX - startXRef.current
    setTranslateX(diff)
  }

  const handleTouchEnd = () => {
    if (Math.abs(translateX) > 80 && onClose) {
      onClose()
    } else {
      setTranslateX(0)
    }
    setIsDragging(false)
    startXRef.current = null
  }

  // --- Colores exactos para cada variante ---
  let borderLeftColor = '#10b981' // Verde
  let iconColor = 'text-emerald-400'
  let Icon = Check

  if (type === 'info') {
    borderLeftColor = '#3b82f6' // Azul
    iconColor = 'text-blue-400'
    Icon = Info
  } else if (type === 'warning' || type === 'error') {
    borderLeftColor = '#f43f5e' // Rojo
    iconColor = 'text-rose-500'
    Icon = AlertTriangle
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${translateX}px)`,
        opacity: Math.max(1 - Math.abs(translateX) / 120, 0),
        transition: isDragging ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
        touchAction: 'pan-y',
        borderLeftColor,
      }}
      className="fixed inset-x-4 top-4 z-50 mx-auto md:inset-x-auto md:right-4 md:mx-0 flex max-w-md items-start justify-between gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl select-none dark:border-slate-800/90 dark:bg-[#0d1527] border-l-[4px] animate-in fade-in slide-in-from-top-4 md:slide-in-from-right-4"
    >
      <div className={`flex ${description ? 'items-start' : 'items-center'} gap-3 min-w-0 flex-1`}>
        <Icon className={`size-5 shrink-0 ${description ? 'mt-0.5' : ''} ${iconColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug wrap-break-word">
            {displayTitle}
          </p>
          {description && (
            <p className="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400 leading-relaxed wrap-break-word">
              {description}
            </p>
          )}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export default ToastAlert