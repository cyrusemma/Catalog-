import { createClient } from '@supabase/supabase-js'

export function normalizeEnvValue(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, '')
}

// Fallback used when env vars are missing or malformed. The anon key is
// RLS-protected and ships in the client bundle, so embedding it is safe.
const defaultSupabaseUrl = 'https://tktakogedsdvrslkyfuh.supabase.co'
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrdGFrb2dlZHNkdnJzbGt5ZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTYxODcsImV4cCI6MjA5NDM3MjE4N30.u8mCNThy6xvek8Riq_ZugNEYRooU1DW-CEvE2Z94R3Q'

// Strip all whitespace: pasted secrets can carry line breaks that become %0A.
const envSupabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const envSupabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const supabaseUrl = envSupabaseUrl || defaultSupabaseUrl
const supabaseAnonKey = envSupabaseAnonKey || defaultSupabaseAnonKey

if (!envSupabaseUrl || !envSupabaseAnonKey) {
  console.warn('Supabase env vars missing; using the public catalog Supabase defaults. Add clean VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values in the deployment settings.')
}

// Auth options are set explicitly: localStorage persistence survives refreshes,
// detectSessionInUrl completes the magic-link callback, and PKCE is the secure
// flow for SPAs.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
