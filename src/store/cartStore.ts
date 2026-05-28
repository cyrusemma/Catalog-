import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product } from '../types'
import { effectivePrice } from '../lib/utils'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const existing = get().items.find(i => i.product.id === product.id)
        if (existing) {
          set({ items: get().items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i) })
        } else {
          set({ items: [...get().items, { product, quantity }] })
        }
      },
      removeItem: (productId) => set({ items: get().items.filter(i => i.product.id !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
        } else {
          set({ items: get().items.map(i => i.product.id === productId ? { ...i, quantity } : i) })
        }
      },
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + effectivePrice(i.product) * i.quantity, 0),
    }),
    { name: 'catalog-cart' }
  )
)
