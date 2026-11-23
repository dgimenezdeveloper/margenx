import type { ToastType } from '@/lib/toast'

/**
 * Aviso que viaja en el estado de la navegación hasta la lista de productos (#432).
 * Crear o eliminar un producto redirige a `/productos`: si el aviso se mostrara antes de
 * redirigir, se perdería con la pantalla. La lista lo muestra una vez y limpia el estado,
 * con el mismo patrón que el aviso al colaborador redirigido (`adminOnlyRedirect.ts`).
 */
export interface ProductNoticeState {
  productNotice: { title: string; type: ToastType }
}

const TOAST_TYPES: readonly ToastType[] = ['success', 'error', 'info', 'warning']

export function productNoticeState(title: string, type: ToastType = 'success'): ProductNoticeState {
  return { productNotice: { title, type } }
}

export function isProductNoticeState(state: unknown): state is ProductNoticeState {
  if (typeof state !== 'object' || state === null) return false
  const notice = (state as Record<string, unknown>).productNotice
  if (typeof notice !== 'object' || notice === null) return false
  const { title, type } = notice as Record<string, unknown>
  return typeof title === 'string' && TOAST_TYPES.includes(type as ToastType)
}
