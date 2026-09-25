import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { authService, type AuthUser } from '@/services/authService'

export function useCurrentUser() {
  const { getToken, isSignedIn, isLoaded } = useAuth()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  useEffect(() => {
    // Si Clerk no cargó o no hay sesión, no disparamos la petición
    if (!isLoaded || !isSignedIn) {
      return
    }

    let active = true

    // La actualización de estado ocurre dentro de la promesa asíncrona,
    // evitando renders síncronos en cascada en el cuerpo del Effect.
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

  // Estado derivado: si no está autenticado, el usuario es null directamente
  const currentUser = isSignedIn ? user : null
  const isLoading = !isLoaded || (isSignedIn && user === null && isFetching)

  return {
    user: currentUser,
    businessName: currentUser?.account?.businessName ?? 'Mi Comercio',
    isLoading,
  }
}