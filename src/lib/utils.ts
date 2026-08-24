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

export interface ProductPriceRangeInfo {
  minPrice: number
  maxPrice: number
  hasRange: boolean
  displayPrice: number
  displayString: string
}

/**
 * Computes price ranges for products with variants.
 * If a product has priced variations (e.g. 500GB @ 700 vs 1TB @ 900),
 * returns minPrice, maxPrice, hasRange: true, and formatted range.
 */
export function getProductPriceRange(product: Product, now: number = Date.now(), markupPercentage: number = 0): ProductPriceRangeInfo {
  const basePrice = effectivePrice(product, now, markupPercentage)
  const variants = product.variants || []
  
  const validVariantPrices = variants
    .map(v => typeof v.price === 'number' ? v.price : parseFloat(v.price as any))
    .filter(p => !Number.isNaN(p) && p > 0)
    .map(p => markupPercentage ? Math.ceil(p * (1 + markupPercentage / 100)) : p)

  if (validVariantPrices.length === 0) {
    return {
      minPrice: basePrice,
      maxPrice: basePrice,
      hasRange: false,
      displayPrice: basePrice,
      displayString: formatPrice(basePrice),
    }
  }

  const minPrice = Math.min(...validVariantPrices)
  const maxPrice = Math.max(...validVariantPrices)
  const hasRange = minPrice !== maxPrice

  return {
    minPrice,
    maxPrice,
    hasRange,
    displayPrice: minPrice,
    displayString: hasRange ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}` : formatPrice(minPrice),
  }
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
  template?: string | null,
  discountAmount = 0
): string {
  const sym = getCurrencySymbol(currency)
  const lines = items.map(i => {
    let line = `• ${i.title} x${i.qty} — ${sym} ${(i.price * i.qty).toFixed(2)}`
    if (i.url) {
      line += `\n  Link: ${i.url}`
    }
    return line
  }).join('\n\n')
  const total = Math.max(0, subtotal + deliveryFee - discountAmount)
  const summary =
    discountAmount > 0
      ? `Subtotal: ${sym} ${subtotal.toFixed(2)}\nDiscount: -${sym} ${discountAmount.toFixed(2)}\nDelivery: ${sym} ${deliveryFee.toFixed(2)}\n*Total: ${sym} ${total.toFixed(2)}*`
      : deliveryFee > 0
      ? `Subtotal: ${sym} ${subtotal.toFixed(2)}\nDelivery: ${sym} ${deliveryFee.toFixed(2)}\n*Total: ${sym} ${total.toFixed(2)}*`
      : `*Total: ${sym} ${total.toFixed(2)}*`

  // Custom template support: admin can override the message body using
  // {items}, {subtotal}, {delivery}, {total}, {currency} placeholders.
  if (template && template.trim()) {
    return template
      .replace(/\{items\}/g, lines)
      .replace(/\{subtotal\}/g, `${sym} ${subtotal.toFixed(2)}`)
      .replace(/\{discount\}/g, discountAmount > 0 ? `-${sym} ${discountAmount.toFixed(2)}` : 'None')
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

export function detectGhanaNetwork(number: string): 'MTN' | 'Telecel' | 'AT' | null {
  if (!number) return null
  const cleaned = number.replace(/\D/g, '')
  
  let national = cleaned
  if (cleaned.startsWith('233')) {
    national = cleaned.substring(3)
  } else if (cleaned.startsWith('0')) {
    national = cleaned.substring(1)
  }

  if (national.length < 2) return null
  const prefix = national.substring(0, 2)

  const mtnPrefixes = ['24', '54', '55', '59', '25', '53']
  const telecelPrefixes = ['20', '50']
  const atPrefixes = ['26', '56', '27', '57']

  if (mtnPrefixes.includes(prefix)) return 'MTN'
  if (telecelPrefixes.includes(prefix)) return 'Telecel'
  if (atPrefixes.includes(prefix)) return 'AT'

  return null
}

export function validateGhanaPhoneNumber(number: string): boolean {
  if (!number) return false
  const cleaned = number.replace(/\D/g, '')
  
  let national = cleaned
  if (cleaned.startsWith('233')) {
    national = cleaned.substring(3)
  } else if (cleaned.startsWith('0')) {
    national = cleaned.substring(1)
  }

  if (national.length !== 9) return false

  const prefix = national.substring(0, 2)
  const validPrefixes = ['24', '54', '55', '59', '25', '53', '20', '50', '26', '56', '27', '57']
  return validPrefixes.includes(prefix)
}

export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    
    // First high note (coin chime)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(880, ctx.currentTime) // A5
    gain1.gain.setValueAtTime(0, ctx.currentTime)
    gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start()
    osc1.stop(ctx.currentTime + 0.3)

    // Second higher note (bell chime)
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(1320, ctx.currentTime) // E6
        gain2.gain.setValueAtTime(0, ctx.currentTime)
        gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.start()
        osc2.stop(ctx.currentTime + 0.4)
      } catch (e) {
        console.error('Audio synthesizer note 2 error:', e)
      }
    }, 80)
  } catch (e) {
    console.error('Audio synthesizer failed to play:', e)
  }
}
