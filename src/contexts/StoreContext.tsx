/**
 * StoreContext — Merchant Tenant Isolation
 *
 * When a customer is inside a merchant storefront (/s/:storeSlug), this context
 * carries the store's identity data throughout the entire subtree so that every
 * nav component, footer, and product query can be scoped to THIS store only —
 * never accidentally falling back to platform-level data.
 *
 * Shopify mental model: this is the "tenant context" that makes the merchant
 * storefront a completely self-contained render surface.
 */
import { createContext, useContext } from 'react'

export interface StoreContextValue {
  storeSlug: string
  storeId: string | null
  storeName: string
  logoUrl: string | null
  tagline: string | null
  socialInstagram: string | null
  socialTiktok: string | null
  socialFacebook: string | null
  whatsappNumber: string | null
  ownerId: string | null
}

const defaultValue: StoreContextValue = {
  storeSlug: '',
  storeId: null,
  storeName: '',
  logoUrl: null,
  tagline: null,
  socialInstagram: null,
  socialTiktok: null,
  socialFacebook: null,
  whatsappNumber: null,
  ownerId: null,
}

export const StoreContext = createContext<StoreContextValue>(defaultValue)

/** Consume the current merchant store context from any child component. */
export function useStoreContext() {
  return useContext(StoreContext)
}
