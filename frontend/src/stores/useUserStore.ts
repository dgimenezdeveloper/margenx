import { create } from 'zustand'
import { authService, type AuthUser } from '@/services/authService'
import type { TokenGetter } from '@/services/api'

interface UserState {
  user: AuthUser | null
  isLoading: boolean
  hasFetched: boolean
  fetchUser: (getToken: TokenGetter, force?: boolean) => Promise<void>
  clearUser: () => void
}

let inFlight: Promise<void> | null = null

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  hasFetched: false,
  fetchUser: async (getToken, force = false) => {
    if (get().hasFetched && !force) return
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