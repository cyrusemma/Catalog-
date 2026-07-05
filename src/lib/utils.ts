import type { Product } from '../types'

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: 'GH₵',
  USD: '$',
  GBP: '£',
  EUR: '€',
  NGN: '₦',
  KES: 'KSh',
  ZAR: 'R',
}

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] || code
}

export function formatPrice(amount: number, currency = 'GHS'): string {
  return `${getCurrencySymbol(currency)} ${amount.toFixed(2)}`
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
export function effectivePrice(product: FlashSaleFields, now: number = Date.now(), markupPercentage: number = 0): number {
  const base = activeFlashSalePrice(product, now) ?? product.selling_price
  if (!markupPercentage) return base
  return Math.ceil(base * (1 + markupPercentage / 100))
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
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

export function buildProductWhatsAppMessage(productTitle: string, price: number, productUrl: string, currency = 'GHS'): string {
  return `Hi! I'd like to order:\n\n*${productTitle}*\nPrice: ${getCurrencySymbol(currency)} ${price.toFixed(2)}\n\nProduct link: ${productUrl}\n\nPlease confirm availability and delivery details. Thank you!`
}

export function buildCartWhatsAppMessage(
  items: { title: string; qty: number; price: number; url?: string }[],
  subtotal: number,
  deliveryFee = 0,
  currency = 'GHS',
  template?: string | null
): string {
  const sym = getCurrencySymbol(currency)
  const lines = items.map(i => {
    let line = `• ${i.title} x${i.qty} — ${sym} ${(i.price * i.qty).toFixed(2)}`
    if (i.url) {
      line += `\n  Link: ${i.url}`
    }
    return line
  }).join('\n\n')
  const total = subtotal + deliveryFee
  const summary =
    deliveryFee > 0
      ? `Subtotal: ${sym} ${subtotal.toFixed(2)}\nDelivery: ${sym} ${deliveryFee.toFixed(2)}\n*Total: ${sym} ${total.toFixed(2)}*`
      : `*Total: ${sym} ${total.toFixed(2)}*`

  // Custom template support: admin can override the message body using
  // {items}, {subtotal}, {delivery}, {total}, {currency} placeholders.
  if (template && template.trim()) {
    return template
      .replace(/\{items\}/g, lines)
      .replace(/\{subtotal\}/g, `${sym} ${subtotal.toFixed(2)}`)
      .replace(/\{delivery\}/g, deliveryFee > 0 ? `${sym} ${deliveryFee.toFixed(2)}` : 'Free')
      .replace(/\{total\}/g, `${sym} ${total.toFixed(2)}`)
      .replace(/\{currency\}/g, currency)
  }

  return `Hi! I'd like to order the following:\n\n${lines}\n\n${summary}\n\nPlease confirm availability and delivery. Thank you!`
}

export function formatPhoneNumber(val: string): string {
  if (!val) return ''
  const cleaned = val.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) return cleaned
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+233' + cleaned.substring(1)
  }
  
  if (cleaned.startsWith('233') && cleaned.length === 12) {
    return '+' + cleaned
  }
  
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return '+233' + cleaned
  }
  
  return cleaned
}
