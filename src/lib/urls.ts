/**
 * Single source of truth for all public-facing absolute URLs.
 *
 * In development (npm run dev), VITE_PUBLIC_URL is not set, so we fall back
 * to window.location.origin for a correct local dev experience.
 * In production, VITE_PUBLIC_URL=https://ccatalog.store is set in Vercel env vars.
 *
 * Never use window.location.origin directly in shareable links - it would
 * produce localhost URLs if a merchant copies a link during local dev.
 */

/** The canonical public base URL (no trailing slash). */
export const PUBLIC_URL: string =
  import.meta.env.VITE_PUBLIC_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://ccatalog.store')

/**
 * Returns the full public URL for a merchant storefront.
 * e.g. getStoreUrl('my-shop') -> 'https://ccatalog.store/s/my-shop'
 */
export function getStoreUrl(slug: string): string {
  return `${PUBLIC_URL}/s/${slug}`
}

/**
 * Returns the full public URL for a product on the main marketplace.
 */
export function getProductUrl(id: string): string {
  return `${PUBLIC_URL}/product/${id}`
}

/**
 * Returns the full public URL for a product within a merchant storefront.
 */
export function getStoreProductUrl(storeSlug: string, productId: string): string {
  return `${PUBLIC_URL}/s/${storeSlug}/product/${productId}`
}
