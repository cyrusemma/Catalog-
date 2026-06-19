import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types'

interface RecentStore {
  recent: Product[]
  addRecent: (product: Product) => void
}

export const useRecentStore = create<RecentStore>()(
  persist(
    (set) => ({
      recent: [],
      addRecent: (product) =>
        set((state) => {
          // Remove the product if it's already in the list to avoid duplicates
          const filtered = state.recent.filter((p) => p.id !== product.id)
          // Add it to the top of the list and keep only the last 10
          return { recent: [product, ...filtered].slice(0, 10) }
        }),
    }),
    {
      name: 'recently-viewed-storage',
    }
  )
)
