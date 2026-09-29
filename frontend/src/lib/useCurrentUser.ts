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

  return {
    user,
    businessName: user?.account?.businessName,
    defaultMinMarginPercent: 30,
    isLoading: isActuallyLoading,
  }
}