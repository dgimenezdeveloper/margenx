export type ToastType = 'success' | 'error' | 'warning' | 'info'

/**
 * Cuánto queda visible cada aviso, según su tipo. Los errores y las advertencias
 * duran el doble que los éxitos: hay que leerlos y, a veces, actuar (#364).
 * Todos se pueden cerrar antes con la X o deslizándolos.
 */
export const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 8000,
  error: 8000,
}
