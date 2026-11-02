import { create } from 'zustand'
import { supplierService, type QuarantinedItem } from '@/services/supplierService'
import { ApiError, type TokenGetter } from '@/services/api'

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
      // Solo ApiError trae un mensaje pensado para el usuario; un fallo de red
      // (TypeError de fetch) mostraría el texto técnico del navegador en inglés.
      const msg = err instanceof ApiError ? err.message : 'No se pudieron cargar los precios en cuarentena.'
      set({ error: msg, isLoading: false })
    }
  },

  removeItemLocally: (id: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id)
    }))
  }
}))