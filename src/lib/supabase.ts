import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
}

/**
 * Auth options are explicit (the defaults match, but stating them out loud
 * stops future tweaks or new SDK majors from silently breaking persistence):
 *  - persistSession + storage point at localStorage so the session survives
 *    a hard refresh.
 *  - detectSessionInUrl is what lets the magic-link callback (the `?code=…`
 *    URL the email link opens) finish into a real session.
 *  - flowType: 'pkce' is the SDK default for SPAs and the secure choice for
 *    magic-link + OAuth; it stores a one-time code_verifier in localStorage
 *    while the user is away in their email client.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
