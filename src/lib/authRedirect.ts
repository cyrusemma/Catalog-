import { PUBLIC_URL } from './urls'
import { supabase } from './supabase'

export const AUTH_REDIRECT_KEY = 'catalog_auth_redirect'
export const LAST_VISITED_STORE_KEY = 'catalog_last_visited_store'

/**
 * Validates a redirect URL to prevent open-redirect vulnerabilities.
 * ONLY allows relative paths starting with a single '/' and NOT '//' or '/\'.
 * Rejects external URLs, protocol-relative URLs, 'javascript:' schemes, and data URIs.
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null

  // Must start with exactly one '/' and NOT '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null
  }

  // Reject javascript:, data:, vbscript: or any scheme-like prefix
  if (/^\/[/\\]/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null
  }

  // Reject encoded backslashes or slashes that could trick parsers (%2f, %5c)
  if (/%2f|%5c/i.test(trimmed)) {
    return null
  }

  try {
    // Parse against a dummy trusted base to verify structure
    const parsed = new URL(trimmed, 'https://ccatalog.store')
    if (parsed.origin !== 'https://ccatalog.store') {
      return null
    }

    // Double-check pathname doesn't attempt protocol smuggling
    if (!parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) {
      return null
    }

    // Do not allow auth callback or password reset as return targets to prevent loops
    if (parsed.pathname === '/auth/callback' || parsed.pathname === '/reset-password') {
      return null
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

/**
 * Saves the sanitized return-to path in sessionStorage.
 */
export function saveAuthRedirect(target: string): void {
  if (typeof window === 'undefined') return
  const sanitized = sanitizeRedirectUrl(target)
  if (sanitized) {
    try {
      sessionStorage.setItem(AUTH_REDIRECT_KEY, sanitized)
    } catch {
      // Ignore quota or private browsing storage errors
    }
  }
}

/**
 * Retrieves the stored return-to path from sessionStorage.
 */
export function getStoredAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = sessionStorage.getItem(AUTH_REDIRECT_KEY)
    return sanitizeRedirectUrl(stored)
  } catch {
    return null
  }
}

/**
 * Clears the stored return-to path from sessionStorage.
 */
export function clearAuthRedirect(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Records the last store slug visited by the customer.
 */
export function recordLastVisitedStore(storeSlug: string): void {
  if (typeof window === 'undefined' || !storeSlug) return
  const cleaned = storeSlug.trim().toLowerCase()
  if (!cleaned) return
  try {
    localStorage.setItem(LAST_VISITED_STORE_KEY, cleaned)
  } catch {
    // Ignore
  }
}

/**
 * Retrieves the last visited store path (e.g. /s/store-slug) if available.
 */
export function getLastVisitedStore(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const slug = localStorage.getItem(LAST_VISITED_STORE_KEY)
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      return `/s/${slug}`
    }
  } catch {
    // Ignore
  }
  return null
}

/**
 * Generates the full callback URL for OAuth / email verification.
 * Points to /auth/callback with an optional ?redirect= query parameter.
 */
export function getAuthCallbackUrl(redirectTarget?: string | null): string {
  // Use window.location.origin in browser so local dev / preview URLs work dynamically,
  // falling back to PUBLIC_URL
  const base = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : PUBLIC_URL

  const callback = `${base}/auth/callback`
  const sanitized = sanitizeRedirectUrl(redirectTarget)
  if (sanitized) {
    return `${callback}?redirect=${encodeURIComponent(sanitized)}`
  }
  return callback
}

/**
 * Resolves where a user should land after authentication:
 * 1. Explicit target passed in or from URL / sessionStorage
 * 2. If merchant (owns a store) -> /dashboard (or /merchant)
 * 3. If customer -> last visited store (e.g. /s/:slug), otherwise /
 */
export async function resolvePostAuthRedirect(
  user?: { id?: string; app_metadata?: Record<string, any> } | null,
  explicitTarget?: string | null
): Promise<string> {
  // 1. Check explicit target
  const sanitizedTarget = sanitizeRedirectUrl(explicitTarget)
  if (sanitizedTarget) return sanitizedTarget

  // 2. Check stored target in sessionStorage
  const stored = getStoredAuthRedirect()
  if (stored) return stored

  // 3. Fallbacks:
  if (user?.id) {
    // Check if the user is a merchant (owns a store)
    try {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (data) {
        return '/dashboard'
      }
    } catch {
      // Continue to customer fallback on network error
    }
  }

  // Customer fallback: last visited store
  const lastStore = getLastVisitedStore()
  if (lastStore) return lastStore

  // Ultimate fallback
  return '/'
}
