import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useUserStore } from '@/stores/useUserStore'

export function useCurrentUser() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const { user, isLoading, hasFetched, fetchUser, clearUser } = useUserStore()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && !hasFetched) {
      fetchUser(getToken)
    } else if (!isSignedIn && hasFetched) {
      clearUser()
    }
  }, [isLoaded, isSignedIn, hasFetched, fetchUser, getToken, clearUser])

  const isActuallyLoading = !isLoaded || (isSignedIn && isLoading)

  // ✅ Corregido: Chequeo estricto != null para no anular el 0%
  const defaultMinMarginPercent =
    currentUser?.account?.defaultMinMarginPercent != null
      ? Number(currentUser.account.defaultMinMarginPercent)
      : 30

  return {
    user,
    businessName: user?.account?.businessName,
    isLoading: isActuallyLoading,
  }
}