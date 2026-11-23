import { Navigate, useLocation } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import type { AdminOnlyRedirectState } from '@/lib/adminOnlyRedirect'
import { LoaderCircle } from 'lucide-react'

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isCollaborator, isLoading } = useUserRole()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (isCollaborator) {
    // El catálogo lee este estado y muestra el aviso de que la pantalla es del administrador.
    const state: AdminOnlyRedirectState = { adminOnlyFrom: location.pathname }
    return <Navigate to="/productos" replace state={state} />
  }

  return <>{children}</>
}
