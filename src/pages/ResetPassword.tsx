import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockKey, Eye, EyeSlash, CheckCircle, Warning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function ResetPassword() {
  useDocumentTitle('Reset Password')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Redirect if they aren't authenticated or don't have a recovery session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        // Postgrest / Supabase sets the recovery session automatically when landing from email
        toast.error('Session expired. Please request a new password reset link.')
        navigate('/')
      }
    })
  }, [navigate])

  const getPasswordStrength = (p: string): number => {
    let score = 0
    if (!p) return 0
    if (p.length >= 6) score += 1
    if (p.length >= 8) score += 1
    if (/[A-Z]/.test(p)) score += 1
    if (/[0-9]/.test(p)) score += 1
    if (/[^a-zA-Z0-9]/.test(p)) score += 1
    return score
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setWorking(true)

    const { error } = await supabase.auth.updateUser({ password })
    setWorking(false)

    if (error) {
      setError(error.message)
      toast.error(error.message)
      return
    }

    setSuccess(true)
    toast.success('Password updated successfully!')
    setTimeout(() => {
      navigate('/account')
    }, 2500)
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16 w-full">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-dark-800 via-dark-900 to-black border border-brand-400/20 shadow-2xl p-6 sm:p-8 overflow-hidden text-center"
      >
        <div className="absolute -top-24 -right-20 w-80 h-80 bg-brand-400/10 rounded-full blur-3xl pointer-events-none" />

        {success ? (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle size={36} weight="fill" className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white">Password Updated!</h2>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              Your password has been reset successfully. Redirecting you to your account page...
            </p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400 mx-auto mb-4">
              <LockKey size={24} weight="duotone" />
            </div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">Reset Your Password</h2>
            <p className="text-white/55 text-sm mb-6">
              Choose a secure, strong password for your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold mb-2">New Password</label>
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                  <LockKey size={16} className="text-white/55" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="text-white/55 hover:text-white/80"
                  >
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {password.length > 0 && (
                <div className="space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Strength Meter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Strength:</span>
                    <div className="flex-1 flex gap-1 h-1.5">
                      {[1, 2, 3, 4, 5].map(step => {
                        const score = getPasswordStrength(password)
                        const active = step <= score
                        let bgClass = 'bg-white/10'
                        if (active) {
                          bgClass = score <= 2 ? 'bg-red-500' : score <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
                        }
                        return (
                          <div
                            key={step}
                            className={`flex-1 h-full rounded-full transition-colors duration-300 ${bgClass}`}
                          />
                        )
                      })}
                    </div>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      getPasswordStrength(password) <= 2 ? 'text-red-400' : getPasswordStrength(password) <= 4 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {getPasswordStrength(password) <= 2 ? 'Weak' : getPasswordStrength(password) <= 4 ? 'Medium' : 'Strong!'}
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-white/5 rounded-2xl p-3 border border-white/5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        password.length >= 6 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                      }`}>
                        <span className="text-[8px] font-bold">✓</span>
                      </div>
                      <span className={password.length >= 6 ? 'text-emerald-400 font-semibold' : 'text-white/55'}>Min 6 characters</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        /[A-Z]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                      }`}>
                        <span className="text-[8px] font-bold">✓</span>
                      </div>
                      <span className={/[A-Z]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        /[0-9]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                      }`}>
                        <span className="text-[8px] font-bold">✓</span>
                      </div>
                      <span className={/[0-9]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Number (0-9)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                        /[^a-zA-Z0-9]/.test(password) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'border-white/20 text-white/40'
                      }`}>
                        <span className="text-[8px] font-bold">✓</span>
                      </div>
                      <span className={/[^a-zA-Z0-9]/.test(password) ? 'text-emerald-400 font-semibold' : 'text-white/55'}>1 Special symbol</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-white/55 text-[10px] uppercase tracking-[0.24em] font-semibold mb-2">Confirm Password</label>
                <div className="flex items-center gap-2 rounded-2xl bg-white/10 border border-white/15 focus-within:border-brand-400/60 px-3 py-2.5">
                  <LockKey size={16} className="text-white/55" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="flex-1 bg-transparent text-white placeholder-white/35 text-sm outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-300 text-xs mt-1 animate-in fade-in duration-200">
                  <Warning size={14} weight="bold" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={working}
                className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-colors mt-2"
              >
                {working ? 'Updating Password…' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </main>
  )
}
