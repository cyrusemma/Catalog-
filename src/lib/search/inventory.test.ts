import { computeStockStatus } from '../inventory'
import type { Product } from '../../types'

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`)
}

export function runInventoryTestSuite() {
  // 1. computeStockStatus tests
  assert(computeStockStatus(0) === 'out_of_stock', '0 stock should be out_of_stock')
  assert(computeStockStatus(-2) === 'out_of_stock', 'Negative stock should be out_of_stock')
  assert(computeStockStatus(1) === 'few_units_left', '1 stock should be few_units_left')
  assert(computeStockStatus(2) === 'few_units_left', '2 stock should be few_units_left')
  assert(computeStockStatus(3) === 'few_units_left', '3 stock should be few_units_left')
  assert(computeStockStatus(4) === 'in_stock', '4 stock should be in_stock')
  assert(computeStockStatus(100) === 'in_stock', '100 stock should be in_stock')

  // 2. Mock product stock decrement logic test
  const testProduct: Product = {
    id: 'prod-hard-drive-1',
    title: 'Portable Hard Drive',
    slug: 'portable-hard-drive',
    description: 'Storage device',
    images: [],
    selling_price: 700,
    stock: 5,
    stock_status: 'in_stock',
    delivery_fee: 0,
    category: 'Storage',
    category_id: null,
    sizes: [],
    colors: [],
    variants: [
      { id: 'v-500', name: '500GB', price: 700, stock: 3 },
      { id: 'v-1tb', name: '1TB', price: 900, stock: 2 },
    ],
    is_featured: false,
    is_published: true,
    created_at: new Date().toISOString(),
  }

  // Simulate purchasing 2 units of 500GB
  const purchasedQty = 2
  const newProductStock = Math.max(0, testProduct.stock - purchasedQty)
  const newStatus = computeStockStatus(newProductStock)
  assert(newProductStock === 3, 'New product stock should be 3')
  assert(newStatus === 'few_units_left', 'Status should transition to few_units_left')

  // Simulate updating variant stock
  const updatedVariants = testProduct.variants!.map(v => {
    if (v.id === 'v-500') {
      return { ...v, stock: Math.max(0, (v.stock || 0) - purchasedQty) }
    }
    return v
  })
  const var500 = updatedVariants.find(v => v.id === 'v-500')
  assert(var500?.stock === 1, '500GB variant stock should be 1')

  // Simulate restock logic
  const restockedQty = 10
  const afterRestock = newProductStock + restockedQty
  const restockedStatus = computeStockStatus(afterRestock)
  assert(afterRestock === 13, 'Restocked quantity should be 13')
  assert(restockedStatus === 'in_stock', 'Status should be in_stock')

  return true
}

// Auto-run verification
try {
  runInventoryTestSuite()
} catch (err) {
  console.error('Inventory test failed:', err)
}
