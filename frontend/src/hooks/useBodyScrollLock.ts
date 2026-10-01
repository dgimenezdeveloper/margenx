import { useEffect } from 'react'

/**
 * Bloquea el scroll del body cuando `isLocked` es `true`.
 *
 * Útil para modales, bottom sheets y overlays que necesitan evitar
 * que el contenido de fondo se desplace al interactuar en mobile.
 *
 * Restaura `overflow` al cerrarse o al desmontarse el componente.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isLocked])
}
