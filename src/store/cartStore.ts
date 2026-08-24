import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, ProductVariant } from '../types'
import { effectivePrice } from '../lib/utils'
import { useToastStore } from './toastStore'

export function getCartItemUnitPrice(item: CartItem): number {
  if (item.selected_variant && typeof item.selected_variant.price === 'number' && item.selected_variant.price > 0) {
    return item.selected_variant.price
  }
  return effectivePrice(item.product)
}

export function getCartItemKey(item: CartItem): string {
  const vId = item.selected_variant?.id || 'base'
  const size = item.selected_size || ''
  const color = item.selected_color || ''
  return `${item.product.id}__${vId}__${size}__${color}`
}

interface CartStore {
  items: CartItem[]
  addItem: (
    product: Product,
    quantity?: number,
    options?: {
      variant?: ProductVariant | null
      size?: string | null
      color?: string | null
    }
  ) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  setItems: (items: CartItem[]) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, options) => {
        const variant = options?.variant ?? null
        const size = options?.size ?? null
        const color = options?.color ?? null

        const targetKey = `${product.id}__${variant?.id || 'base'}__${size || ''}__${color || ''}`
        const existingIdx = get().items.findIndex(i => getCartItemKey(i) === targetKey)

        if (existingIdx >= 0) {
          const updated = [...get().items]
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + quantity,
          }
          set({ items: updated })
        } else {
          set({
            items: [
              ...get().items,
              {
                product,
                quantity,
                selected_variant: variant,
                selected_size: size,
                selected_color: color,
              },
            ],
          })
        }

        const variantSuffix = variant ? ` (${variant.name})` : ''
        useToastStore.getState().addToast({
          title: 'Added to cart',
          message: `${product.title}${variantSuffix}`,
          type: 'success',
        })
      },
      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(i => {
            if (variantId !== undefined) {
              return !(i.product.id === productId && (i.selected_variant?.id || 'base') === (variantId || 'base'))
            }
            return i.product.id !== productId
          }),
        })
      },
      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
        } else {
          set({
            items: get().items.map(i => {
              const match =
                variantId !== undefined
                  ? i.product.id === productId && (i.selected_variant?.id || 'base') === (variantId || 'base')
                  : i.product.id === productId
              return match ? { ...i, quantity } : i
            }),
          })
        }
      },
      setItems: items => set({ items }),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + getCartItemUnitPrice(i) * i.quantity, 0),
    }),
    { name: 'catalog-cart' }
  )
)
