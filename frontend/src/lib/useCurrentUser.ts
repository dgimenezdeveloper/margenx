import { useEffect, useCallback } from 'react'
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

  const refreshUser = useCallback(async () => {
    if (!isSignedIn) return
    await fetchUser(getToken, true)
  }, [getToken, isSignedIn, fetchUser])

  const isActuallyLoading = !isLoaded || (isSignedIn && isLoading)

  const defaultMinMarginPercent =
    user?.account?.defaultMinMarginPercent != null
      ? Number(user.account.defaultMinMarginPercent)
      : 30

  return {
    user,
    businessName: user?.account?.businessName,
    defaultMinMarginPercent,
    isLoading: isActuallyLoading,
    refreshUser,
  }
}