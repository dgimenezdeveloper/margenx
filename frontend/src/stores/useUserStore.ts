import { create } from 'zustand'
import { authService, type AuthUser } from '@/services/authService'
import type { TokenGetter } from '@/services/api'

interface UserState {
  user: AuthUser | null
  isLoading: boolean
  hasFetched: boolean
  fetchUser: (getToken: TokenGetter) => Promise<void>
  clearUser: () => void
}

// Promesa compartida a nivel de módulo para deduplicar llamadas concurrentes (ej: Navbar y Profile simultáneos)
let inFlight: Promise<void> | null = null

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  hasFetched: false,
  fetchUser: async (getToken) => {
    if (get().hasFetched) return
    if (inFlight) return inFlight

    inFlight = (async () => {
      set({ isLoading: true })
      try {
        const data = await authService.getMe(getToken)
        set({ user: data, isLoading: false, hasFetched: true })
      } catch {
        set({ user: null, isLoading: false, hasFetched: true })
      }
    })().finally(() => {
      inFlight = null
    })

    return inFlight
  },
  clearUser: () => {
    inFlight = null
    set({ user: null, isLoading: false, hasFetched: false })
  },
}))