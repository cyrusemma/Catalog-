import { supabase } from './supabase'
import type { Product, ProductVariant } from '../types'

export type StockStatus = 'in_stock' | 'few_units_left' | 'out_of_stock'

/**
 * Determines stock status based on unit count:
 * - 0 units: 'out_of_stock'
 * - 1 to 3 units: 'few_units_left'
 * - > 3 units: 'in_stock'
 */
export function computeStockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out_of_stock'
  if (stock <= 3) return 'few_units_left'
  return 'in_stock'
}

export interface OrderItemForInventory {
  product_id: string
  quantity: number
  variant_name?: string | null
  variant_id?: string | null
}

/**
 * Deducts inventory for items purchased in an order.
 * Updates the products table and any matched variants in real-time.
 */
export async function deductOrderInventory(
  orderId: string | null,
  items: OrderItemForInventory[]
): Promise<boolean> {
  if (!items || items.length === 0) return true

  try {
    for (const item of items) {
      if (!item.product_id || item.quantity <= 0) continue

      // 1. Try invoking Supabase RPC function if available
      const { error: rpcError } = await supabase.rpc('deduct_product_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_variant_name: item.variant_name || item.variant_id || null,
      })

      // 2. If RPC is not created yet in user's Supabase instance, use client-side update
      if (rpcError) {
        const { data: prod } = await supabase
          .from('products')
          .select('id, stock, variants')
          .eq('id', item.product_id)
          .maybeSingle()

        if (prod) {
          const currentStock = typeof prod.stock === 'number' ? prod.stock : 0
          const newStock = Math.max(0, currentStock - item.quantity)
          const newStatus = computeStockStatus(newStock)

          let updatedVariants = prod.variants || []
          if (Array.isArray(updatedVariants) && updatedVariants.length > 0 && (item.variant_name || item.variant_id)) {
            updatedVariants = updatedVariants.map((v: ProductVariant) => {
              if (v.name === item.variant_name || v.id === item.variant_id || v.id === item.variant_name) {
                const vStock = typeof v.stock === 'number' ? v.stock : currentStock
                return {
                  ...v,
                  stock: Math.max(0, vStock - item.quantity),
                }
              }
              return v
            })
          }

          await supabase
            .from('products')
            .update({
              stock: newStock,
              stock_status: newStatus,
              variants: updatedVariants,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id)
        }
      }
    }

    // Mark order as stock_deducted if orderId provided
    if (orderId) {
      await supabase
        .from('orders')
        .update({ stock_deducted: true })
        .eq('id', orderId)
    }

    return true
  } catch (err) {
    console.error('Inventory deduction failed:', err)
    return false
  }
}

/**
 * Restores inventory when an order is cancelled or refunded.
 */
export async function restoreOrderInventory(
  orderId: string,
  items: OrderItemForInventory[]
): Promise<boolean> {
  if (!items || items.length === 0) return true

  try {
    for (const item of items) {
      if (!item.product_id || item.quantity <= 0) continue

      const { error: rpcError } = await supabase.rpc('restore_product_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_variant_name: item.variant_name || item.variant_id || null,
      })

      if (rpcError) {
        const { data: prod } = await supabase
          .from('products')
          .select('id, stock, variants')
          .eq('id', item.product_id)
          .maybeSingle()

        if (prod) {
          const currentStock = typeof prod.stock === 'number' ? prod.stock : 0
          const newStock = currentStock + item.quantity
          const newStatus = computeStockStatus(newStock)

          let updatedVariants = prod.variants || []
          if (Array.isArray(updatedVariants) && updatedVariants.length > 0 && (item.variant_name || item.variant_id)) {
            updatedVariants = updatedVariants.map((v: ProductVariant) => {
              if (v.name === item.variant_name || v.id === item.variant_id || v.id === item.variant_name) {
                const vStock = typeof v.stock === 'number' ? v.stock : currentStock
                return {
                  ...v,
                  stock: vStock + item.quantity,
                }
              }
              return v
            })
          }

          await supabase
            .from('products')
            .update({
              stock: newStock,
              stock_status: newStatus,
              variants: updatedVariants,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id)
        }
      }
    }

    await supabase
      .from('orders')
      .update({ stock_deducted: false })
      .eq('id', orderId)

    return true
  } catch (err) {
    console.error('Inventory restore failed:', err)
    return false
  }
}

/**
 * Restocks a product directly from the Admin Inventory dashboard.
 */
export async function restockProduct(
  product: Product,
  addUnits: number,
  options?: { exactStock?: number; variantId?: string }
): Promise<boolean> {
  try {
    const currentStock = typeof product.stock === 'number' ? product.stock : 0
    const newStock = options?.exactStock !== undefined ? Math.max(0, options.exactStock) : Math.max(0, currentStock + addUnits)
    const newStatus = computeStockStatus(newStock)

    let updatedVariants = product.variants || []
    if (options?.variantId && Array.isArray(updatedVariants)) {
      updatedVariants = updatedVariants.map(v => {
        if (v.id === options.variantId) {
          const vStock = typeof v.stock === 'number' ? v.stock : currentStock
          const nextVStock = options.exactStock !== undefined ? Math.max(0, options.exactStock) : Math.max(0, vStock + addUnits)
          return { ...v, stock: nextVStock }
        }
        return v
      })
    }

    const { error } = await supabase
      .from('products')
      .update({
        stock: newStock,
        stock_status: newStatus,
        variants: updatedVariants,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to restock product:', err)
    return false
  }
}
