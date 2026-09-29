import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { authService, type AuthUser } from '@/services/authService'

export function useCurrentUser() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  const fetchUser = useCallback(async () => {
    if (!isSignedIn) return
    setIsFetching(true)
    try {
      const data = await authService.getMe(getToken)
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setIsFetching(false)
    }
  }, [getToken, isSignedIn])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    let active = true
    authService
      .getMe(getToken)
      .then((data: AuthUser) => {
        if (active) {
          setUser(data)
          setIsFetching(false)
        }
      })
      .catch(() => {
        if (active) {
          setUser(null)
          setIsFetching(false)
        }
      })

    return () => {
      active = false
    }
  }, [getToken, isSignedIn, isLoaded])

  const currentUser = isSignedIn ? user : null
  const isLoading = !isLoaded || (isSignedIn && user === null && isFetching)

  // ✅ Corregido: Chequeo estricto != null para no anular el 0%
  const defaultMinMarginPercent =
    currentUser?.account?.defaultMinMarginPercent != null
      ? Number(currentUser.account.defaultMinMarginPercent)
      : 30

  return {
    user: currentUser,
    businessName: currentUser?.account?.businessName ?? 'Mi Comercio',
    defaultMinMarginPercent,
    isLoading,
    refreshUser: fetchUser,
  }
}