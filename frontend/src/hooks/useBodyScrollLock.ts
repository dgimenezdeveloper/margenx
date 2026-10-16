import { useEffect } from 'react'

/**
 * Bloquea el scroll del body cuando `isLocked` es `true`.
 *
 * Implementa el workaround específico para iOS Safari, donde `overflow: hidden`
 * es ignorado si el modal hijo tiene su propio scroll. Fija el body y preserva
 * la posición del scroll al cerrar.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    // 1. Capturar la posición actual del scroll antes de bloquear
    const scrollY = window.scrollY;

    // 2. Aplicar bloqueo estricto (Workaround iOS)
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      // 3. Limpiar estilos al desmontar o desbloquear
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';

      // 4. Restaurar la posición exacta del scroll
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}