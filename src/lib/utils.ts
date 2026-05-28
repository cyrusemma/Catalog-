import type { Product } from '../types'

export function formatPrice(amount: number, currency = 'GHS'): string {
  return `${currency} ${amount.toFixed(2)}`
}

type FlashSaleFields = Pick<Product, 'selling_price' | 'flash_sale_price' | 'flash_sale_ends_at'>

/**
 * Returns the active flash-sale price for a product, or null when there is no
 * live sale. A sale is only active when a price and an end time are both set,
 * the price is genuinely lower than the normal price, and the end time has not
 * passed — so the UI reverts to the normal price the moment the timer expires.
 */
export function activeFlashSalePrice(product: FlashSaleFields, now: number = Date.now()): number | null {
  const price = product.flash_sale_price
  const endsAt = product.flash_sale_ends_at
  if (price == null || !endsAt) return null
  const end = new Date(endsAt).getTime()
  if (Number.isNaN(end) || end <= now) return null
  if (price <= 0 || price >= product.selling_price) return null
  return price
}

/** The price the customer actually pays right now (flash-sale price if live, else selling price). */
export function effectivePrice(product: FlashSaleFields, now: number = Date.now()): number {
  return activeFlashSalePrice(product, now) ?? product.selling_price
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function isNewProduct(createdAt: string, days = 7): boolean {
  const created = new Date(createdAt)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return created > cutoff
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function buildProductWhatsAppMessage(productTitle: string, price: number, productUrl: string): string {
  return `Hi! I'd like to order:\n\n*${productTitle}*\nPrice: GHS ${price.toFixed(2)}\n\nProduct link: ${productUrl}\n\nPlease confirm availability and delivery details. Thank you!`
}

export function buildCartWhatsAppMessage(
  items: { title: string; qty: number; price: number }[],
  subtotal: number,
  deliveryFee = 0,
  currency = 'GHS',
  template?: string | null
): string {
  const lines = items.map(i => `• ${i.title} x${i.qty} — ${currency} ${(i.price * i.qty).toFixed(2)}`).join('\n')
  const total = subtotal + deliveryFee
  const summary =
    deliveryFee > 0
      ? `Subtotal: ${currency} ${subtotal.toFixed(2)}\nDelivery: ${currency} ${deliveryFee.toFixed(2)}\n*Total: ${currency} ${total.toFixed(2)}*`
      : `*Total: ${currency} ${total.toFixed(2)}*`

  // Custom template support: admin can override the message body using
  // {items}, {subtotal}, {delivery}, {total}, {currency} placeholders.
  if (template && template.trim()) {
    return template
      .replace(/\{items\}/g, lines)
      .replace(/\{subtotal\}/g, `${currency} ${subtotal.toFixed(2)}`)
      .replace(/\{delivery\}/g, deliveryFee > 0 ? `${currency} ${deliveryFee.toFixed(2)}` : 'Free')
      .replace(/\{total\}/g, `${currency} ${total.toFixed(2)}`)
      .replace(/\{currency\}/g, currency)
  }

  return `Hi! I'd like to order the following:\n\n${lines}\n\n${summary}\n\nPlease confirm availability and delivery. Thank you!`
}
