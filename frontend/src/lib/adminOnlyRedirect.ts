/**
 * Estado de navegación que deja `AdminOnlyRoute` al devolver a un colaborador a `/productos`,
 * para que el catálogo le avise que la pantalla que abrió es del administrador (#364).
 */
export interface AdminOnlyRedirectState {
  adminOnlyFrom: string
}

export const ADMIN_ONLY_NOTICE = {
  title: 'Esa pantalla es solo para el administrador',
  description: 'Te trajimos al catálogo de productos.',
} as const

export function isAdminOnlyRedirectState(state: unknown): state is AdminOnlyRedirectState {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof (state as Record<string, unknown>).adminOnlyFrom === 'string'
  )
}
