export function formatPrice(amount: number, currency = 'GHS'): string {
  return `${currency} ${amount.toFixed(2)}`
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
  currency = 'GHS'
): string {
  const lines = items.map(i => `• ${i.title} x${i.qty} — ${currency} ${(i.price * i.qty).toFixed(2)}`).join('\n')
  const total = subtotal + deliveryFee
  const summary =
    deliveryFee > 0
      ? `Subtotal: ${currency} ${subtotal.toFixed(2)}\nDelivery: ${currency} ${deliveryFee.toFixed(2)}\n*Total: ${currency} ${total.toFixed(2)}*`
      : `*Total: ${currency} ${total.toFixed(2)}*`
  return `Hi! I'd like to order the following:\n\n${lines}\n\n${summary}\n\nPlease confirm availability and delivery. Thank you!`
}
