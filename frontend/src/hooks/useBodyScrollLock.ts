import { useEffect } from 'react'

/**
 * Bloquea el scroll del body cuando `isLocked` es `true`.
 *
 * Aplica `overflow: hidden` y `touchAction: none` para prevenir scroll
 * parásito y rebote táctil en dispositivos móviles (incluido iOS Safari).
 *
 * Restaura los estilos originales al cerrarse o al desmontarse el componente.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return

    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction

    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
    }
  }, [isLocked])
}