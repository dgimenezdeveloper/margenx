import { useEffect } from 'react'

/**
 * Variables a nivel de módulo compartidas entre todas las instancias del hook.
 * Permiten coordinar múltiples modales/diálogos abiertos en simultáneo
 * mediante conteo de referencias (reference counting).
 */
let activeLocks = 0
let originalScrollY = 0
let originalPaddingRight = ''

/**
 * Bloquea el scroll del body cuando `isLocked` es `true`.
 *
 * Implementa el workaround específico para iOS Safari (position: fixed + top negativo)
 * y compensa la desaparición de la barra de desplazamiento en Desktop (layout shift).
 * Soporta múltiples modales activos concurrentemente sin perder la posición original.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    // Solo el primer lock captura la posición del scroll y aplica los estilos
    if (activeLocks === 0) {
      originalScrollY = window.scrollY
      originalPaddingRight = document.body.style.paddingRight

      // Compensación del ancho de la barra de scroll en desktop
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

      document.body.style.position = 'fixed'
      document.body.style.top = `-${originalScrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`
      }
    }

    activeLocks++

    return () => {
      activeLocks = Math.max(0, activeLocks - 1)

      // Solo restauramos los estilos y la posición cuando ya no queden locks activos
      if (activeLocks === 0) {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        document.body.style.paddingRight = originalPaddingRight

        if (typeof window.scrollTo === 'function') {
          window.scrollTo(0, originalScrollY)
        }
      }
    }
  }, [isLocked])
}