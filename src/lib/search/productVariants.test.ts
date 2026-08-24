import { getProductPriceRange, buildCartWhatsAppMessage } from '../utils'
import { getCartItemUnitPrice, getCartItemKey } from '../../store/cartStore'
import { validateProductForm } from '../productValidation'
import type { Product, CartItem } from '../../types'

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`)
}

export function testProductVariantsSuite() {
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

  // 1. Dynamic price range calculation
  const range = getProductPriceRange(baseProduct)
  assert(range.hasRange === true, 'Should detect price range')
  assert(range.minPrice === 700, 'Min price should be 700')
  assert(range.maxPrice === 1400, 'Max price should be 1400')
  assert(range.displayString.includes('700.00'), 'Display string should contain 700')
  assert(range.displayString.includes('1400.00'), 'Display string should contain 1400')

  // 2. Fallback when no variants
  const noVariantProduct: Product = {
    ...baseProduct,
    variants: [],
    selling_price: 350,
  }
  const noRange = getProductPriceRange(noVariantProduct)
  assert(noRange.hasRange === false, 'Should not have range without variants')
  assert(noRange.minPrice === 350, 'Min price should equal selling_price')

  // 3. Cart unit price with variant
  const variant1TB = baseProduct.variants![1] // 1TB @ 900
  const cartItem: CartItem = {
    product: baseProduct,
    quantity: 2,
    selected_variant: variant1TB,
  }
  assert(getCartItemUnitPrice(cartItem) === 900, 'Unit price should be 900 for 1TB variant')
  assert(getCartItemKey(cartItem) === 'prod-hard-drive-1__var-1tb____', 'Cart key must match variant')

  // 4. Cart item keys differentiate variations
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
  assert(getCartItemKey(item500gb) !== getCartItemKey(item1tb), 'Keys should be distinct')
  assert(getCartItemUnitPrice(item500gb) === 700, '500GB price is 700')
  assert(getCartItemUnitPrice(item1tb) === 900, '1TB price is 900')

  // 5. Product form validation
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
  assert(validateProductForm(validForm, { publishing: true }) === null, 'Form with variants should be valid')

  // 6. WhatsApp message formatting
  const items = [
    {
      title: 'Seagate External Hard Drive (1TB)',
      qty: 1,
      price: 900,
      url: 'https://catalog.com/product/prod-hard-drive-1',
    },
  ]
  const msg = buildCartWhatsAppMessage(items, 900, 15, 'GHS')
  assert(msg.includes('Seagate External Hard Drive (1TB) x1 — GH₵ 900.00'), 'Should format line item')
  assert(msg.includes('Total: GH₵ 915.00'), 'Should calculate total')

  return true
}

// Auto-run when executed
try {
  testProductVariantsSuite()
} catch (err) {
  console.error('Product variants tests failed:', err)
}
