import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface CustomerProfile {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  notify_new_arrivals: boolean
  cart: any[]
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

/**
 * Tracks the current Supabase auth session and the matching profile row.
 * Admin sessions count as logged in here too — the storefront just sees an
 * account; admin-only UI is gated separately by isAdminSession in lib/admin.
 */
export function useCustomerSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

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
      // Bust the profile cache so a fresh sign-in pulls the new row.
      qc.invalidateQueries({ queryKey: ['customer-profile'] })
    })
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      if (callbackGuardTimer) window.clearTimeout(callbackGuardTimer)
      unsubscribe?.()
    }
  }, [qc])

  const user: User | null = session?.user ?? null

  const profile = useQuery({
    queryKey: ['customer-profile', user?.id ?? null],
    queryFn: async (): Promise<CustomerProfile | null> => {
      if (!user) return null
      const fallback = deriveProfileFromUser(user)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, notify_new_arrivals, cart, created_at')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        return fallback
      }

      return (data as CustomerProfile) ?? fallback
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })

  return {
    session,
    user,
    profile: profile.data ?? null,
    loading: loading || (!!user && profile.isLoading),
    isLoggedIn: !!user,
  }
}
