import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useUserStore } from '@/stores/useUserStore'

export function useCurrentUser() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const { user, isLoading, hasFetched, fetchUser, clearUser } = useUserStore()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && !hasFetched) {
      void fetchUser(getToken)
    } else if (!isSignedIn && hasFetched) {
      clearUser()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, hasFetched])

  const isActuallyLoading = !isLoaded || (isSignedIn && isLoading)

  return {
    user,
    businessName: user?.account?.businessName,
    defaultMinMarginPercent: user?.account?.defaultMinMarginPercent != null
      ? Number(user.account.defaultMinMarginPercent)
      : 30,
    isLoading: isActuallyLoading,
  }
}