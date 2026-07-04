/**
 * AppReviewPrompt — Smart In-App Rating Prompt
 *
 * Shows ONLY after the user has genuinely engaged with the platform.
 * Inspired by how top apps (Airbnb, Duolingo, Spotify) time their review requests:
 * trigger at a "happy moment" after real interaction, never on first load.
 *
 * Engagement signals tracked in localStorage:
 *  - session_count         ← incremented every page load
 *  - products_viewed       ← incremented when user views a product detail
 *  - cart_interactions     ← incremented when user adds to cart
 *  - orders_placed         ← incremented when user completes an order
 *  - first_visit_at        ← timestamp of first ever visit
 *
 * Trigger condition (all must be true):
 *  1. NOT already reviewed or permanently dismissed
 *  2. At least 2 sessions (returned visitor, not first-timer)
 *  3. At least 3 products viewed OR 1 cart interaction
 *  4. At least 24 hours since first visit
 *  5. No temporary "remind me later" snooze active (7-day snooze)
 *
 * Show moment: 8 seconds after mount (delayed, never jarring).
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, X, Heart, ArrowRight, Clock } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabase'

// ─── Engagement tracking helpers (pure localStorage, no DB) ──────────────────

const EK = {
  sessions:     'app_sessions',
  productsViewed: 'app_products_viewed',
  cartInteractions: 'app_cart_interactions',
  ordersPlaced: 'app_orders_placed',
  firstVisitAt: 'app_first_visit_at',
  reviewStatus: 'app_review_status',   // 'done' | 'never' | timestamp (snooze until)
} as const

export function trackSession() {
  const count = parseInt(localStorage.getItem(EK.sessions) || '0', 10)
  localStorage.setItem(EK.sessions, String(count + 1))
  if (!localStorage.getItem(EK.firstVisitAt)) {
    localStorage.setItem(EK.firstVisitAt, String(Date.now()))
  }
}

export function trackProductView() {
  const count = parseInt(localStorage.getItem(EK.productsViewed) || '0', 10)
  localStorage.setItem(EK.productsViewed, String(count + 1))
}

export function trackCartInteraction() {
  const count = parseInt(localStorage.getItem(EK.cartInteractions) || '0', 10)
  localStorage.setItem(EK.cartInteractions, String(count + 1))
}

export function trackOrderPlaced() {
  const count = parseInt(localStorage.getItem(EK.ordersPlaced) || '0', 10)
  localStorage.setItem(EK.ordersPlaced, String(count + 1))
}

function shouldShowPrompt(): boolean {
  const status = localStorage.getItem(EK.reviewStatus)

  // Never show if permanently done or blocked
  if (status === 'done' || status === 'never') return false

  // Respect snooze window
  if (status && !isNaN(Number(status))) {
    if (Date.now() < Number(status)) return false
  }

  const sessions      = parseInt(localStorage.getItem(EK.sessions) || '0', 10)
  const productsViewed = parseInt(localStorage.getItem(EK.productsViewed) || '0', 10)
  const cartInteractions = parseInt(localStorage.getItem(EK.cartInteractions) || '0', 10)
  const ordersPlaced   = parseInt(localStorage.getItem(EK.ordersPlaced) || '0', 10)
  const firstVisitAt  = parseInt(localStorage.getItem(EK.firstVisitAt) || '0', 10)

  // Must have returned at least once (≥2 sessions)
  if (sessions < 2) return false

  // Must have had real product engagement OR placed an order
  const hasEngaged = productsViewed >= 3 || cartInteractions >= 1 || ordersPlaced >= 1

  // Fast-track: placing an order is a very happy moment
  if (ordersPlaced >= 1 && sessions >= 2) return true

  if (!hasEngaged) return false

  // Must be at least 24 hours since first visit
  const hoursSinceFirst = (Date.now() - firstVisitAt) / (1000 * 60 * 60)
  if (hoursSinceFirst < 24) return false

  return true
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppReviewPrompt() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<'ask' | 'rate' | 'thanks'>('ask')
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!shouldShowPrompt()) return

    // Delay show — appears naturally after the user has settled in
    const timer = setTimeout(() => setVisible(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = (permanent = false) => {
    setVisible(false)
    if (permanent) {
      localStorage.setItem(EK.reviewStatus, 'never')
    }
  }

  const handleSnooze = () => {
    const snoozeUntil = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    localStorage.setItem(EK.reviewStatus, String(snoozeUntil))
    setVisible(false)
  }

  const handleLike = () => {
    setRating(5)
    setStep('rate')
  }

  const handleSubmit = async () => {
    if (rating === 0) return
    setSubmitting(true)
    try {
      await supabase.from('site_reviews').insert({
        rating,
        message: comment.trim() || `Rated ${rating} star${rating !== 1 ? 's' : ''} via in-app prompt.`,
        name: null,
        email: null,
        page_url: window.location.pathname,
      })
    } catch {
      // Best-effort — don't fail the UI
    }
    localStorage.setItem(EK.reviewStatus, 'done')
    setSubmitting(false)
    setStep('thanks')
    setTimeout(() => setVisible(false), 3000)
  }

  const displayRating = hoverRating || rating

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop (subtle, doesn't block content) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.15)' }}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[100] pb-[env(safe-area-inset-bottom,0px)] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm"
          >
            <div className="
              bg-white dark:bg-dark-800
              rounded-t-3xl sm:rounded-3xl
              border border-cream-200 dark:border-white/10
              shadow-2xl
              overflow-hidden
            ">
              {/* Top handle (mobile only) */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-cream-300 dark:bg-white/20" />
              </div>

              {/* ── Step: Ask ─────────────────────────────────────────────── */}
              {step === 'ask' && (
                <div className="p-6 pb-8">
                  <button
                    onClick={() => handleDismiss(false)}
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-7 h-7 rounded-full flex items-center justify-center text-dark-800/30 dark:text-white/30 hover:text-dark-800 dark:hover:text-white hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close"
                  >
                    <X size={14} weight="bold" />
                  </button>

                  <div className="flex flex-col items-center text-center gap-4">
                    {/* Animated heart icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-brand-400/10 flex items-center justify-center"
                    >
                      <Heart size={32} weight="fill" className="text-brand-400" />
                    </motion.div>

                    <div>
                      <h3 className="text-lg font-display font-bold text-dark-800 dark:text-white">
                        Enjoying the app?
                      </h3>
                      <p className="text-sm text-dark-800/55 dark:text-white/45 mt-1 leading-relaxed max-w-[260px]">
                        You've been exploring for a while — we'd love to hear what you think!
                      </p>
                    </div>

                    <div className="flex gap-3 w-full mt-1">
                      <button
                        onClick={handleSnooze}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-cream-200 dark:border-white/10 text-dark-800/60 dark:text-white/50 text-sm font-semibold hover:border-brand-400/30 transition-colors"
                      >
                        <Clock size={14} /> Ask later
                      </button>
                      <button
                        onClick={handleLike}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-brand-400 hover:bg-brand-500 text-white text-sm font-bold shadow-sm transition-colors"
                      >
                        Yes! <ArrowRight size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleDismiss(true)}
                      className="text-xs text-dark-800/30 dark:text-white/25 hover:text-dark-800/50 dark:hover:text-white/40 transition-colors"
                    >
                      Don't ask again
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Rate ─────────────────────────────────────────────── */}
              {step === 'rate' && (
                <div className="p-6 pb-8">
                  <button
                    onClick={() => setStep('ask')}
                    className="absolute top-4 right-4 sm:top-5 sm:right-5 w-7 h-7 rounded-full flex items-center justify-center text-dark-800/30 dark:text-white/30 hover:text-dark-800 dark:hover:text-white hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Back"
                  >
                    <X size={14} weight="bold" />
                  </button>

                  <div className="flex flex-col items-center text-center gap-5">
                    <div>
                      <h3 className="text-lg font-display font-bold text-dark-800 dark:text-white">
                        Rate your experience
                      </h3>
                      <p className="text-sm text-dark-800/50 dark:text-white/40 mt-1">
                        {displayRating === 0 && 'Tap a star to rate'}
                        {displayRating === 1 && 'Needs a lot of work'}
                        {displayRating === 2 && 'Could be better'}
                        {displayRating === 3 && 'Pretty good'}
                        {displayRating === 4 && 'Really enjoying it!'}
                        {displayRating === 5 && 'Love it! 🎉'}
                      </p>
                    </div>

                    {/* Star picker */}
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <motion.button
                          key={star}
                          type="button"
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          aria-label={`Rate ${star} stars`}
                          className="outline-none"
                        >
                          <motion.div
                            animate={{ scale: displayRating >= star ? 1.15 : 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          >
                            <Star
                              size={36}
                              weight={displayRating >= star ? 'fill' : 'regular'}
                              className={
                                displayRating >= star
                                  ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(212,130,10,0.5)]'
                                  : 'text-cream-300 dark:text-white/20'
                              }
                            />
                          </motion.div>
                        </motion.button>
                      ))}
                    </div>

                    {/* Optional comment */}
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Tell us more (optional)…"
                      rows={2}
                      className="input w-full text-sm resize-none text-center placeholder:text-center"
                    />

                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting}
                      className="btn-primary w-full py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Sending…' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Thanks ───────────────────────────────────────────── */}
              {step === 'thanks' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 flex flex-col items-center text-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
                    className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center"
                  >
                    <Heart size={32} weight="fill" className="text-green-500" />
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-display font-bold text-dark-800 dark:text-white">
                      Thank you! 💛
                    </h3>
                    <p className="text-sm text-dark-800/50 dark:text-white/40 mt-1">
                      Your feedback means a lot and helps us improve.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
