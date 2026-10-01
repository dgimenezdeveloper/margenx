import { useEffect, useCallback } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Protege al usuario contra la pérdida accidental de datos no guardados.
 *
 * Funcionalidades:
 * 1. Registra `beforeunload` en el navegador para interceptar recarga / cierre de pestaña.
 * 2. Usa `useBlocker` de React Router para interceptar navegación interna (SPA).
 * 3. Expone estado derivado y callbacks para renderizar un diálogo de confirmación en la UI.
 *
 * @param isDirty — `true` cuando el formulario tiene cambios sin guardar.
 */
export function useUnsavedChangesWarning(isDirty: boolean) {
  // ------------------------------------------------------------------
  // 1. Protección contra cierre / recarga del navegador (beforeunload)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [isDirty])

  // ------------------------------------------------------------------
  // 2. Protección contra navegación interna (React Router)
  // ------------------------------------------------------------------
  const blocker = useBlocker(isDirty)

  // Estado derivado directamente de React Router (elimina setState en effect)
  const showDialog = blocker.state === 'blocked'

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }, [blocker])

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker])

  return { showDialog, confirmNavigation, cancelNavigation }
}