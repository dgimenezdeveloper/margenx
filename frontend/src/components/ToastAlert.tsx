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
  offset = 0,
}: ToastAlertProps) {
  // Soporta tanto 'title' como el 'message' anterior
  const displayTitle = title ?? message ?? ''
  const topPosition = 16 + offset * 80

  // --- Lógica de Swipe-to-Dismiss para Mobile ---
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
    if (Math.abs(translateX) > 100 && onClose) {
      onClose()
    } else {
      setTranslateX(0)
    }
    setIsDragging(false)
    startXRef.current = null
  }
  // ----------------------------------------------

  let iconColor = 'text-emerald-500 dark:text-emerald-400'
  let borderColor = 'border-emerald-500'
  let Icon = Check

  if (type === 'error') {
    iconColor = 'text-red-500 dark:text-red-400'
    borderColor = 'border-red-500'
    Icon = AlertTriangle
  } else if (type === 'warning') {
    iconColor = 'text-amber-500 dark:text-amber-400'
    borderColor = 'border-amber-500'
    Icon = AlertTriangle
  } else if (type === 'info') {
    iconColor = 'text-blue-500 dark:text-blue-400'
    borderColor = 'border-blue-500'
    Icon = Info
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        top: `${topPosition}px`,
        transform: `translateX(${translateX}px)`,
        opacity: Math.max(1 - Math.abs(translateX) / 150, 0),
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      className={`fixed inset-x-4 md:inset-x-auto md:right-4 z-50 mx-auto md:mx-0 flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 bg-white p-4 shadow-xl dark:bg-gray-900 border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-gray-800 dark:border-r-gray-800 animate-in fade-in slide-in-from-top-4 md:slide-in-from-right-8 ${borderColor}`}
    >
      <Icon className={`size-5 shrink-0 mt-0.5 ${iconColor}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {displayTitle}
        </p>
        {description && (
          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export default ToastAlert