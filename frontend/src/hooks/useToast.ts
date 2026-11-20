import { useCallback, useEffect, useRef, useState } from 'react'

import { TOAST_DURATION_MS, type ToastType } from '@/lib/toast'

export interface ToastState {
  id: number
  title: string
  description?: string
  type: ToastType
}

let toastIdCounter = 0

/**
 * Aviso único de una pantalla. Cada aviso nuevo cancela el temporizador del anterior,
 * así un aviso viejo nunca acorta al siguiente, y dura lo que fija `TOAST_DURATION_MS`
 * para su tipo. `dismiss` lo cierra en el acto (la X o el deslizamiento de `ToastAlert`).
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setToast(null)
  }, [clearTimer])

  const notify = useCallback(
    (title: string, type: ToastType = 'success', description?: string) => {
      clearTimer()
      toastIdCounter += 1
      setToast({ id: toastIdCounter, title, description, type })
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        setToast(null)
      }, TOAST_DURATION_MS[type])
    },
    [clearTimer]
  )

  useEffect(() => clearTimer, [clearTimer])

  return { toast, notify, dismiss }
}
