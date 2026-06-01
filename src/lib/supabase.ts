import { createClient } from '@supabase/supabase-js'

export function normalizeEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, '')
}

const defaultSupabaseUrl = 'https://tktakogedsdvrslkyfuh.supabase.co'
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIa3Rha29nZWRzZHZyc2xreWZ1aCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzc4Nzk2MTg3LCJleHAiOjIwOTQzNzIxODd9.u8mCNThy6xvek8Riq_ZugNEYRooU1DW-CEvE2Z94R3Q'

// Strip all whitespace, not just a trailing trim, because pasted secrets can
// pick up invisible line breaks that turn into `%0A` in the Supabase URL.
const envSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const envSupabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const supabaseUrl = envSupabaseUrl || defaultSupabaseUrl
const supabaseAnonKey = envSupabaseAnonKey || defaultSupabaseAnonKey

if (!envSupabaseUrl || !envSupabaseAnonKey) {
  console.warn('Supabase env vars missing; using the public catalog Supabase defaults. Add clean VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values in the deployment settings.')
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
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
