import { useCurrentUser } from '@/lib/useCurrentUser'

export function useUserRole() {
  const { user, isLoading } = useCurrentUser()

  return {
    role: user?.role || null,
    isCollaborator: user?.role === 'COLLABORATOR',
    isAdmin: user?.role === 'ADMIN',
    isLoading
  }
}