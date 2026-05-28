import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isAdminSession } from '../../lib/admin'
import { Store, Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const adminTheme = (() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('catalog-admin-theme')
    return stored === 'amoled' || stored === 'gold' ? stored : 'light'
  })()
  const unauthorized = (location.state as { error?: string } | null)?.error === 'unauthorized'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid credentials. Please try again.')
    } else if (!isAdminSession(data.session)) {
      await supabase.auth.signOut()
      setError('This account does not have admin access.')
    } else {
      navigate('/admin')
    }
    setLoading(false)
  }

  return (
    <div className={`admin-shell admin-theme-${adminTheme} min-h-dvh bg-[#f8f4ef] flex items-center justify-center px-4`}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to manage your store</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors bg-gray-50 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-10 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors bg-gray-50 focus:bg-white"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {unauthorized && !error && (
            <p className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
              Admin access required. Sign in with an admin account.
            </p>
          )}

          {error && (
            <p className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
