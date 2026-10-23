import { create } from 'zustand'
import { supplierService, type QuarantinedItem } from '@/services/supplierService'
import type { TokenGetter } from '@/services/api'

interface QuarantineState {
  items: QuarantinedItem[]
  isLoading: boolean
  error: string | null
  fetchItems: (getToken: TokenGetter) => Promise<void>
  removeItemLocally: (id: string) => void
}

export const useQuarantineStore = create<QuarantineState>((set) => ({
  items: [],
  isLoading: true,
  error: null,

  fetchItems: async (getToken: TokenGetter) => {
    set({ isLoading: true, error: null })
    try {
      const items = await supplierService.getQuarantine(getToken)
      set({ items, isLoading: false })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar la cuarentena'
      set({ error: msg, isLoading: false })
    }
  },

  removeItemLocally: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }))
  }
}))