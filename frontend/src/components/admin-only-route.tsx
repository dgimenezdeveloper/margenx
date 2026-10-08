import { Navigate } from 'react-router-dom'
import { useUserRole } from '@/hooks/useUserRole'
import { LoaderCircle } from 'lucide-react'

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isCollaborator, isLoading } = useUserRole()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoaderCircle className="size-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (isCollaborator) {
    return <Navigate to="/productos" replace />
  }

  return <>{children}</>
}