import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { authService, type AuthUser } from '@/services/authService'

export function useCurrentUser() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  // <-- NUEVA FUNCIÓN PARA REFRESCAR EL USUARIO TRAS GUARDAR
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

  // <-- EXTRAEMOS EL MARGEN GLOBAL (Por defecto 30 si no existe)
  const defaultMinMarginPercent = currentUser?.account?.defaultMinMarginPercent
    ? Number(currentUser.account.defaultMinMarginPercent)
    : 30

  return {
    user: currentUser,
    businessName: currentUser?.account?.businessName ?? 'Mi Comercio',
    defaultMinMarginPercent, // <-- LO EXPONEMOS
    isLoading,
    refreshUser: fetchUser,  // <-- LO EXPONEMOS
  }
}