import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types'

interface WishlistStore {
  items: Product[]
  toggle: (product: Product) => void
  remove: (productId: string) => void
  clear: () => void
  has: (productId: string) => boolean
  count: () => number
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const exists = get().items.some(p => p.id === product.id)
        if (exists) {
          set({ items: get().items.filter(p => p.id !== product.id) })
        } else {
          set({ items: [product, ...get().items] })
        }
      },
      remove: (productId) => set({ items: get().items.filter(p => p.id !== productId) }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some(p => p.id === productId),
      count: () => get().items.length,
    }),
    { name: 'catalog-wishlist' }
  )
)
