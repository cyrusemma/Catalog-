import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../types'
import { useToastStore } from './toastStore'

interface WishlistStore {
  items: Product[]
  toggle: (product: Product) => void
  remove: (productId: string) => void
  setItems: (items: Product[]) => void
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
          useToastStore.getState().addToast({
            title: 'Added to wishlist',
            message: `${product.title}`,
            type: 'success',
          })
        }
      },
      remove: (productId) => set({ items: get().items.filter(p => p.id !== productId) }),
      setItems: (items) => set({ items }),
      clear: () => set({ items: [] }),
      has: (productId) => get().items.some(p => p.id === productId),
      count: () => get().items.length,
    }),
    { name: 'catalog-wishlist' }
  )
)
