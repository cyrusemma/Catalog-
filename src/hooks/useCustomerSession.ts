import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface CustomerProfile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  notify_new_arrivals: boolean
  cart: any[]
  wishlist?: any[]
  phone?: string | null
  address?: string | null
  store_credit?: number
  followed_stores?: string[]
  created_at: string
}

function deriveProfileFromUser(user: User): CustomerProfile {
  const nameFromMeta =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: nameFromMeta ?? (user.email ? user.email.split('@')[0] : null),
    avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    notify_new_arrivals: false,
    cart: [],
    wishlist: [],
    phone: null,
    address: null,
    store_credit: 0,
    followed_stores: [],
    created_at: new Date().toISOString(),
  }
}

function hasPendingAuthCallback(): boolean {
  if (typeof window === 'undefined') return false
  const search = window.location.search
  const hash = window.location.hash
  return (
    search.includes('code=') ||
    search.includes('access_token=') ||
    search.includes('refresh_token=') ||
    hash.includes('access_token=') ||
    hash.includes('refresh_token=')
  )
}

function normalizeProfileRow(row: any, fallback: CustomerProfile): CustomerProfile {
  return {
    id: typeof row?.id === 'string' ? row.id : fallback.id,
    email: typeof row?.email === 'string' || row?.email === null ? row.email : fallback.email,
    display_name:
      typeof row?.display_name === 'string' || row?.display_name === null
        ? row.display_name
        : fallback.display_name,
    avatar_url:
      typeof row?.avatar_url === 'string' || row?.avatar_url === null
        ? row.avatar_url
        : fallback.avatar_url,
    notify_new_arrivals: typeof row?.notify_new_arrivals === 'boolean' ? row.notify_new_arrivals : false,
    cart: Array.isArray(row?.cart) ? row.cart : [],
    wishlist: Array.isArray(row?.wishlist) ? row.wishlist : [],
    phone: typeof row?.phone === 'string' || row?.phone === null ? row.phone : null,
    address: typeof row?.address === 'string' || row?.address === null ? row.address : null,
    store_credit: typeof row?.store_credit === 'number' ? row.store_credit : 0,
    followed_stores: Array.isArray(row?.followed_stores) ? row.followed_stores : [],
    created_at: typeof row?.created_at === 'string' ? row.created_at : fallback.created_at,
  }
}

function looksLikeMissingColumnError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('column') || m.includes('schema cache') || m.includes('does not exist')
}

async function fetchProfileWithFallback(user: User): Promise<CustomerProfile> {
  const fallback = deriveProfileFromUser(user)

  const projections = [
    'id, email, display_name, avatar_url, notify_new_arrivals, cart, wishlist, phone, address, store_credit, followed_stores, created_at',
    'id, email, display_name, avatar_url, notify_new_arrivals, cart, wishlist, created_at',
    'id, email, display_name, avatar_url, notify_new_arrivals, cart, created_at',
    'id, email, display_name, avatar_url, created_at',
    'id, email, display_name, avatar_url',
  ]

  for (const projection of projections) {
    const { data, error } = await supabase
      .from('profiles')
      .select(projection)
      .eq('id', user.id)
      .maybeSingle()

    if (!error) {
      if (!data) return fallback
      return normalizeProfileRow(data, fallback)
    }

    // If the schema is missing one of our requested columns, retry with a
    // slimmer select. Any other error (RLS/network/etc) falls back immediately.
    if (!looksLikeMissingColumnError(error.message)) {
      return fallback
    }
  }

  return fallback
}

/**
 * Tracks the current Supabase auth session and the matching profile row.
 * Admin sessions count as logged in here too — the storefront just sees an
 * account; admin-only UI is gated separately by isAdminSession in lib/admin.
 */
export function useCustomerSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined
    let callbackGuardTimer: number | undefined
    const waitingForCallback = hasPendingAuthCallback()

    if (waitingForCallback) {
      // Prevent route guards from bouncing users while Supabase completes
      // OAuth/magic-link callback exchange.
      callbackGuardTimer = window.setTimeout(() => {
        if (mounted) setLoading(false)
      }, 5000)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session || !waitingForCallback) {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      if (callbackGuardTimer) window.clearTimeout(callbackGuardTimer)
      unsubscribe?.()
    }
  }, [])

  const user: User | null = session?.user ?? null

  const profile = useQuery({
    queryKey: ['customer-profile', user?.id ?? null],
    queryFn: async (): Promise<CustomerProfile | null> => {
      if (!user) return null
      try {
        return await fetchProfileWithFallback(user)
      } catch {
        return deriveProfileFromUser(user)
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return {
    session,
    user,
    profile: profile.data ?? null,
    loading: loading || (!!user && profile.isLoading),
    isLoggedIn: !!user,
  }
}
