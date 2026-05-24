const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function isValidImageUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return `"${file.name}" must be JPEG, PNG, WebP, or GIF`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" exceeds 5 MB`
  }
  return null
}

export function extensionForMime(mime: string): string {
  return MIME_EXT[mime] || 'jpg'
}

export interface ProductFormValues {
  title: string
  selling_price: string
  original_price: string
  discount_percent: string
  stock: string
  images: string[]
}

export function validateProductForm(
  form: ProductFormValues,
  options: { publishing: boolean }
): string | null {
  if (!form.title.trim()) return 'Product title is required'

  const selling = parseFloat(form.selling_price)
  if (options.publishing) {
    if (!form.selling_price.trim() || Number.isNaN(selling) || selling <= 0) {
      return 'Selling price must be greater than 0 to publish'
    }
  } else if (form.selling_price.trim() && (Number.isNaN(selling) || selling < 0)) {
    return 'Selling price cannot be negative'
  }

  if (form.original_price.trim()) {
    const original = parseFloat(form.original_price)
    if (Number.isNaN(original) || original < 0) return 'Original price must be zero or greater'
  }

  if (form.discount_percent.trim()) {
    const discount = parseInt(form.discount_percent, 10)
    if (Number.isNaN(discount) || discount < 0 || discount > 100) {
      return 'Discount must be between 0 and 100'
    }
  }

  const stock = parseInt(form.stock, 10)
  if (form.stock.trim() && (Number.isNaN(stock) || stock < 0)) {
    return 'Stock cannot be negative'
  }

  for (const img of form.images) {
    if (!isValidImageUrl(img)) {
      return 'All image URLs must use http or https'
    }
  }

  return null
}
