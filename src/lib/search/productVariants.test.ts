import { describe, it, expect } from 'vitest'
import { getProductPriceRange, buildCartWhatsAppMessage } from '../utils'
import { getCartItemUnitPrice, getCartItemKey } from '../../store/cartStore'
import { validateProductForm } from '../productValidation'
import type { Product, CartItem } from '../../types'

describe('Product Variants & Dynamic Price Ranges', () => {
  const baseProduct: Product = {
    id: 'prod-hard-drive-1',
    title: 'Seagate External Hard Drive',
    slug: 'seagate-external-hard-drive',
    description: 'High speed portable storage',
    images: ['https://example.com/images/drive-main.jpg', 'https://example.com/images/drive-500gb.jpg', 'https://example.com/images/drive-1tb.jpg'],
    selling_price: 700,
    original_price: 1000,
    stock: 20,
    stock_status: 'in_stock',
    delivery_fee: 15,
    category: 'Storage',
    category_id: 'cat-storage',
    sizes: [],
    colors: [],
    variants: [
      {
        id: 'var-500gb',
        name: '500GB',
        price: 700,
        original_price: 850,
        image_url: 'https://example.com/images/drive-500gb.jpg',
        stock: 12,
      },
      {
        id: 'var-1tb',
        name: '1TB',
        price: 900,
        original_price: 1100,
        image_url: 'https://example.com/images/drive-1tb.jpg',
        stock: 8,
      },
      {
        id: 'var-2tb',
        name: '2TB',
        price: 1400,
        original_price: 1600,
        stock: 5,
      },
    ],
    is_featured: true,
    is_published: true,
    created_at: new Date().toISOString(),
  }

  it('calculates dynamic price range when product has multiple priced variants', () => {
    const range = getProductPriceRange(baseProduct)
    expect(range.hasRange).toBe(true)
    expect(range.minPrice).toBe(700)
    expect(range.maxPrice).toBe(1400)
    expect(range.displayString).toContain('700.00')
    expect(range.displayString).toContain('1400.00')
  })

  it('handles products with no variants gracefully', () => {
    const noVariantProduct: Product = {
      ...baseProduct,
      variants: [],
      selling_price: 350,
    }
    const range = getProductPriceRange(noVariantProduct)
    expect(range.hasRange).toBe(false)
    expect(range.minPrice).toBe(350)
    expect(range.maxPrice).toBe(350)
  })

  it('computes unit price correctly from selected variant', () => {
    const variant1TB = baseProduct.variants![1] // 1TB @ 900
    const cartItem: CartItem = {
      product: baseProduct,
      quantity: 2,
      selected_variant: variant1TB,
    }

    const unitPrice = getCartItemUnitPrice(cartItem)
    expect(unitPrice).toBe(900)

    const itemKey = getCartItemKey(cartItem)
    expect(itemKey).toBe('prod-hard-drive-1__var-1tb____')
  })

  it('distinguishes cart items by variant ID', () => {
    const item500gb: CartItem = {
      product: baseProduct,
      quantity: 1,
      selected_variant: baseProduct.variants![0],
    }
    const item1tb: CartItem = {
      product: baseProduct,
      quantity: 1,
      selected_variant: baseProduct.variants![1],
    }

    expect(getCartItemKey(item500gb)).not.toBe(getCartItemKey(item1tb))
    expect(getCartItemUnitPrice(item500gb)).toBe(700)
    expect(getCartItemUnitPrice(item1tb)).toBe(900)
  })

  it('validates product form with variants correctly', () => {
    const validForm = {
      title: 'Seagate External Hard Drive',
      selling_price: '',
      original_price: '',
      discount_percent: '',
      stock: '10',
      images: ['https://example.com/img.jpg'],
      variants: [
        { id: '1', name: '500GB', price: 700 },
        { id: '2', name: '1TB', price: 900 },
      ],
    }

    const error = validateProductForm(validForm, { publishing: true })
    expect(error).toBeNull()

    const invalidVariantForm = {
      ...validForm,
      variants: [
        { id: '1', name: '', price: 700 },
      ],
    }
    const invalidError = validateProductForm(invalidVariantForm, { publishing: true })
    expect(invalidError).toContain('must have a name')
  })

  it('builds WhatsApp order message including variant options', () => {
    const items = [
      {
        title: 'Seagate External Hard Drive (1TB)',
        qty: 1,
        price: 900,
        url: 'https://catalog.com/product/prod-hard-drive-1',
      },
    ]

    const msg = buildCartWhatsAppMessage(items, 900, 15, 'GHS')
    expect(msg).toContain('Seagate External Hard Drive (1TB) x1 — GH₵ 900.00')
    expect(msg).toContain('Total: GH₵ 915.00')
  })
})
