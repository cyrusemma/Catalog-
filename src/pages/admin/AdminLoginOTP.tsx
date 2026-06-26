import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAdminSession } from '../../lib/admin'
import { Store, Phone, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function AdminLoginOTP() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        phone: phone.startsWith('+') ? phone : `+${phone}`,
        options: { shouldCreateUser: false },
      })

      if (signInError) {
        setError('Failed to send OTP. Please check your phone number.')
      } else {
        setStep('verify')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone.startsWith('+') ? phone : `+${phone}`,
        token: otp,
        type: 'sms',
      })

      if (verifyError) {
        setError('Invalid OTP. Please try again.')
      } else if (!isAdminSession(data.session)) {
        await supabase.auth.signOut()
        setError('This phone is not authorized as admin.')
      } else {
        navigate('/admin')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#f8f4ef] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in with your phone number</p>
        </div>

        <form
          onSubmit={step === 'phone' ? handlePhoneSubmit : handleOTPSubmit}
          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4"
        >
          {step === 'phone' ? (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+233 24 123 4567"
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors bg-gray-50 focus:bg-white"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Include country code (e.g., +233)</p>
              </div>

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
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1.5">Enter OTP Code</label>
                <div className="relative">
                  <Check size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors bg-gray-50 focus:bg-white tracking-widest text-center text-lg"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Check your SMS for the code</p>
              </div>

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
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone')
                  setOtp('')
                  setError('')
                }}
                className="w-full text-brand-400 hover:text-brand-500 text-sm font-medium py-2"
              >
                Back to phone
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
