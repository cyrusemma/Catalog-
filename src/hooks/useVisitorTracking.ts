import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SESSION_LOGGED_KEY = 'catalog-visit-logged'
const SESSION_ID_KEY = 'catalog-session-id'

/**
 * Logs one anonymous visit per browser session. Reloads inside the same tab
 * stay deduped via sessionStorage, so the count tracks distinct browsing
 * sessions rather than page views. Failures (network, RLS, schema drift) are
 * swallowed — a downed counter must never break the storefront.
 */
export function useVisitorTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(SESSION_LOGGED_KEY)) return

    let sessionId = window.sessionStorage.getItem(SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      window.sessionStorage.setItem(SESSION_ID_KEY, sessionId)
    }
    window.sessionStorage.setItem(SESSION_LOGGED_KEY, '1')

    supabase
      .from('visits')
      .insert({ session_id: sessionId })
      .then(
        () => {},
        () => {},
      )
  }, [])
}
