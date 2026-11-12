import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { usePublicSession } from '@/hooks/usePublicSession'

interface PublicSessionLinkProps {
  /** Enlace para el visitante sin sesión (por ejemplo "Ingresar" o "Volver a la web"). */
  signedOut: { to: string; label: string }
  className: string
  icon?: ReactNode
}

const PANEL_LINK = { to: '/dashboard', label: 'Ir al panel' } as const

/**
 * Enlace de las pantallas públicas que reconoce la sesión: con sesión lleva al panel. Mientras
 * Clerk verifica, reserva el lugar sin mostrar texto, para que el botón no cambie a la vista.
 */
export function PublicSessionLink({ signedOut, className, icon }: PublicSessionLinkProps) {
  const session = usePublicSession()

  if (session === 'checking') {
    return (
      <span aria-hidden="true" className={`${className} invisible`}>
        {icon}
        {signedOut.label}
      </span>
    )
  }

  const target = session === 'signed-in' ? PANEL_LINK : signedOut
  return (
    <Link to={target.to} className={className}>
      {icon}
      {target.label}
    </Link>
  )
}
