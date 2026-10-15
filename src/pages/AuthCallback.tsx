import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  clearAuthRedirect,
  resolvePostAuthRedirect,
  sanitizeRedirectUrl,
} from '../lib/authRedirect'
import { Loader2, AlertCircle, ArrowLeft, RotateCw } from 'lucide-react'
import SEOHead from '../components/layout/SEOHead'

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const handleAuth = async () => {
    setErrorMsg(null)

    // 1. Check for error params from provider (e.g. access_denied, expired link)
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    if (errorParam || errorDesc) {
      setErrorMsg(errorDesc || errorParam || 'Authentication failed. Please try again.')
      return
    }

    try {
      // 2. PKCE code exchange if ?code= is present
      const code = searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          // If code was already exchanged by detectSessionInUrl or another tab, verify if session exists
          const { data: sessionData } = await supabase.auth.getSession()
          if (!sessionData.session) {
            console.error('Code exchange failed:', exchangeError)
            setErrorMsg(exchangeError.message || 'Verification link expired or already used.')
            return
          }
        }
      }

      // 3. Confirm session is established
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no session yet, wait briefly for Supabase detectSessionInUrl or auth state change
      let currentSession = session
      if (!currentSession) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2500)
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            if (s) {
              currentSession = s
              clearTimeout(timeout)
              subscription.unsubscribe()
              resolve()
            }
          })
        })
      }

      // 4. Resolve destination
      // Check query param first (from ?redirect=...), then router state, then fallback
      const redirectQuery = searchParams.get('redirect')
      const stateRedirect = (location.state as { redirect?: string } | null)?.redirect
      const explicitTarget = sanitizeRedirectUrl(redirectQuery) || sanitizeRedirectUrl(stateRedirect)

      const destination = await resolvePostAuthRedirect(currentSession?.user, explicitTarget)

      // 5. Clean up stored redirect and navigate
      clearAuthRedirect()
      navigate(destination, { replace: true })
    } catch (err: any) {
      console.error('Auth callback error:', err)
      setErrorMsg(err.message || 'An unexpected error occurred while completing sign-in.')
    }
  }

  useEffect(() => {
    handleAuth()
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <SEOHead
        title="Signing in | Catalog"
        description="Completing secure authentication"
      />

      <div className="max-w-md w-full text-center space-y-6">
        {errorMsg ? (
          <div className="bg-white dark:bg-dark-900 border border-red-500/20 rounded-3xl p-8 shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-display font-bold text-dark-800 dark:text-white">
                Unable to Complete Sign-in
              </h1>
              <p className="text-sm text-dark-800/60 dark:text-white/60 leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setRetrying(true)
                  handleAuth().finally(() => setRetrying(false))
                }}
                disabled={retrying}
                className="btn-primary justify-center py-2.5 text-sm inline-flex items-center gap-2"
              >
                <RotateCw size={16} className={retrying ? 'animate-spin' : ''} />
                Try Again
              </button>
              <Link
                to="/"
                className="btn-ghost justify-center py-2.5 text-sm inline-flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-brand-400/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-brand-400/10 border border-brand-400/30 flex items-center justify-center text-brand-400">
                <Loader2 size={32} className="animate-spin" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-display font-bold text-dark-800 dark:text-white">
                Completing sign-in…
              </h2>
              <p className="text-xs text-dark-800/50 dark:text-white/50">
                Returning you to your store page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
