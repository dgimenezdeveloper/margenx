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

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: true,
  hasFetched: false,
  fetchUser: async (getToken) => {
    if (get().hasFetched) return
    set({ isLoading: true })
    try {
      const data = await authService.getMe(getToken)
      set({ user: data, isLoading: false, hasFetched: true })
    } catch {
      // Omitimos la variable 'error' ya que no la usamos, evitando el warning del linter
      set({ user: null, isLoading: false, hasFetched: true })
    }
  },
  clearUser: () => set({ user: null, isLoading: false, hasFetched: false })
}))