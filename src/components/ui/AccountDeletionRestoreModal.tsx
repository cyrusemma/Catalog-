import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SignOut, Warning, CheckCircle } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabase'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function AccountDeletionRestoreModal() {
  const { isLoggedIn, user, profile, loading } = useCustomerSession()
  const queryClient = useQueryClient()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  if (loading || !isLoggedIn || !profile?.deletion_requested_at) {
    return null
  }

  const requestedAt = new Date(profile.deletion_requested_at)
  const deletionDate = new Date(requestedAt.getTime() + 14 * 24 * 60 * 60 * 1000)
  const daysLeft = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const handleRestore = async () => {
    if (!user) return
    setWorking(true)
    setError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deletion_requested_at: null })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Your account has been successfully restored! 🎉')
      // Invalidate queries to reload active session
      queryClient.invalidateQueries({ queryKey: ['customer-profile', user.id] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore account. Please try again.')
    } finally {
      setWorking(false)
    }
  }

  const handleSignOut = async () => {
    setWorking(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      toast.error('Failed to sign out.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
        {/* Blurred backdrop blocking clicks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white dark:bg-dark-800 rounded-3xl shadow-2xl p-6 md:p-8 overflow-hidden border border-cream-200 dark:border-brand-400/15"
        >
          {/* Subtle colored header line */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-gradient-x" />

          <div className="flex flex-col items-center text-center mt-2">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mb-6 relative">
              <Warning size={32} weight="bold" className="text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-dark-800 rounded-full animate-ping" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Account Scheduled for Deletion
            </h2>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-md">
              A deletion request was submitted on <span className="font-semibold text-gray-800 dark:text-gray-200">{requestedAt.toLocaleDateString()}</span>.
              Your account and data are scheduled to be permanently erased on <span className="font-semibold text-red-500">{deletionDate.toLocaleDateString()}</span> ({daysLeft} days remaining).
            </p>

            {/* Warning details */}
            <div className="w-full bg-cream-50 dark:bg-dark-900/50 border border-cream-200 dark:border-brand-400/10 rounded-2xl p-4 text-left text-xs text-gray-600 dark:text-gray-400 space-y-2 mb-6">
              <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-400" /> What this means:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Your customer account is currently inactive.</li>
                <li>If you are a vendor/merchant, your storefront has been suspended and set to maintenance mode.</li>
                <li>Logging out keeps the deletion schedule active.</li>
                <li>Restoring your account recovers full access immediately.</li>
              </ul>
            </div>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-3 rounded-xl w-full mb-4 text-left">
                {error}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row w-full gap-3">
              <button
                type="button"
                disabled={working}
                onClick={handleSignOut}
                className="flex-1 order-2 sm:order-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-white transition-colors disabled:opacity-50"
              >
                <SignOut size={16} weight="bold" /> Sign Out
              </button>
              <button
                type="button"
                disabled={working}
                onClick={handleRestore}
                className="flex-1 order-1 sm:order-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-400 hover:bg-brand-500 text-white font-semibold px-4 py-3.5 text-sm transition-all shadow-sm disabled:opacity-50"
              >
                {working ? 'Restoring...' : 'Restore Account'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
