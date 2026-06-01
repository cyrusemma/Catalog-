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
  created_at: string
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

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Bust the profile cache so a fresh sign-in pulls the new row.
      qc.invalidateQueries({ queryKey: ['customer-profile'] })
    })
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [qc])

  const user: User | null = session?.user ?? null

  const profile = useQuery({
    queryKey: ['customer-profile', user?.id ?? null],
    queryFn: async (): Promise<CustomerProfile | null> => {
      if (!user) return null
      const { data } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url, notify_new_arrivals, created_at')
        .eq('id', user.id)
        .maybeSingle()
      return (data as CustomerProfile) ?? null
    },
    enabled: !!user,
    staleTime: 1000 * 60,
  })

  return {
    session,
    user,
    profile: profile.data ?? null,
    loading,
    isLoggedIn: !!user,
  }
}
