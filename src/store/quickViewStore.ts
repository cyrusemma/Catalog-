import { create } from 'zustand'
import type { Product } from '../types'

interface QuickViewStore {
  product: Product | null
  open: boolean
  openModal: (product: Product) => void
  closeModal: () => void
}

export const useQuickViewStore = create<QuickViewStore>((set) => ({
  product: null,
  open: false,
  openModal: (product) => set({ product, open: true }),
  closeModal: () => set({ open: false }),
}))
