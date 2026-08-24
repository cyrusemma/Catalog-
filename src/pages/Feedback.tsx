import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, CaretLeft, ArrowRight, Smiley, Trophy } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { toast } from 'sonner'

interface SurveyQuestion {
  id: string
  label: string
  subtitle: string
  icon: string
}

const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'navigation',
    label: 'Navigation & Browsing',
    subtitle: 'How easy is it to find products, categories, and navigate the store?',
    icon: '🔍'
  },
  {
    id: 'design',
    label: 'Visual Design & Layout',
    subtitle: 'How appealing and clean is the interface and visual styling?',
    icon: '🎨'
  },
  {
    id: 'speed',
    label: 'Performance & Speed',
    subtitle: 'How fast do pages load, images render, and actions respond?',
    icon: '⚡'
  }
]

export default function Feedback() {
  const { profile } = useCustomerSession()
  const navigate = useNavigate()

  // Wizard steps: 
  // 0: Intro
  // 1: Navigation Question
  // 2: Design Question
  // 3: Speed Question
  // 4: Overall Rating & Comments & Contact Info
  // 5: Success Screen
  const [step, setStep] = useState(0)

  // Survey responses
  const [responses, setResponses] = useState<Record<string, number>>({
    navigation: 0,
    design: 0,
    speed: 0
  })
  const [hoverRating, setHoverRating] = useState(0)

  // Overall reviews
  const [overallRating, setOverallRating] = useState(0)
  const [overallHover, setOverallHover] = useState(0)
  const [message, setMessage] = useState('')
  const [name, setName] = useState(profile?.display_name || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [submitting, setSubmitting] = useState(false)

  const handleRatingSelect = (questionId: string, rating: number) => {
    setResponses(prev => ({ ...prev, [questionId]: rating }))
    // Automatically advance to next step after selection for seamless UX
    setTimeout(() => {
      setStep(prev => prev + 1)
      setHoverRating(0)
    }, 300)
  }

  const handleSkip = (questionId: string) => {
    setResponses(prev => ({ ...prev, [questionId]: 0 }))
    setStep(prev => prev + 1)
    setHoverRating(0)
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1)
      setHoverRating(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overallRating === 0) {
      toast.error('Please select an overall rating before submitting.')
      return
    }

    setSubmitting(true)
    try {
      // Build survey responses JSON, filtering out skipped questions
      const surveyData: Record<string, number> = {}
      SURVEY_QUESTIONS.forEach(q => {
        if (responses[q.id] > 0) {
          surveyData[q.id] = responses[q.id]
        }
      })

      const { error } = await supabase.from('site_reviews').insert({
        rating: overallRating,
        message: message.trim() || `Submitted site feedback survey.`,
        name: name.trim() || null,
        email: email.trim() || null,
        page_url: '/feedback',
        survey_responses: Object.keys(surveyData).length > 0 ? surveyData : null
      })

      if (error) throw error

      setStep(5) // Move to success step
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercentage = (step / 4) * 100

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12 flex flex-col justify-center min-h-[75vh]">
      {/* Progress Bar */}
      {step > 0 && step < 5 && (
        <div className="w-full bg-cream-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden mb-8">
          <motion.div 
            className="h-full bg-brand-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="relative bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden min-h-[460px] flex flex-col justify-between">
        
        {/* Navigation Arrow */}
        {step > 0 && step < 5 && (
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 text-xs font-bold text-dark-800/40 dark:text-white/40 hover:text-brand-400 dark:hover:text-brand-400 flex items-center gap-1 transition-colors"
          >
            <CaretLeft size={16} weight="bold" /> Back
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 0: Welcome Intro */}
          {step === 0 && (
            <motion.div
              key="step-intro"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-400/10 flex items-center justify-center text-brand-400">
                <Smiley size={36} weight="duotone" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white">
                  Help Us Improve Catalog!
                </h1>
                <p className="text-sm text-dark-800/60 dark:text-white/50 mt-3 max-w-md mx-auto leading-relaxed">
                  Your feedback helps us create a better shopping experience. Take our 1-minute survey, or skip directly to write a general review.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-md shadow-brand-400/25 active:scale-95"
              >
                Start Survey <ArrowRight size={16} weight="bold" />
              </button>
              <button
                onClick={() => setStep(4)}
                className="text-xs text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white font-semibold transition-colors mt-2"
              >
                Skip straight to writing feedback
              </button>
            </motion.div>
          )}

          {/* STEPS 1, 2, 3: Survey Questions */}
          {step >= 1 && step <= 3 && (() => {
            const q = SURVEY_QUESTIONS[step - 1]
            const activeRating = responses[q.id]
            const displayRating = hoverRating || activeRating

            return (
              <motion.div
                key={`step-${q.id}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col justify-center items-center text-center py-6"
              >
                <div className="text-4xl mb-4">{q.icon}</div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-400 mb-1">
                  Question {step} of 3
                </span>
                <h2 className="text-2xl font-bold text-dark-800 dark:text-white mb-2">
                  {q.label}
                </h2>
                <p className="text-sm text-dark-800/55 dark:text-white/50 max-w-md mb-8 leading-relaxed">
                  {q.subtitle}
                </p>

                {/* Rating Pickers */}
                <div className="flex items-center gap-3 mb-10">
                  {[1, 2, 3, 4, 5].map(star => (
                    <motion.button
                      key={star}
                      type="button"
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleRatingSelect(q.id, star)}
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
                          size={40}
                          weight={displayRating >= star ? 'fill' : 'regular'}
                          className={
                            displayRating >= star
                              ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(212,130,10,0.4)]'
                              : 'text-cream-200 dark:text-white/10'
                          }
                        />
                      </motion.div>
                    </motion.button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSkip(q.id)}
                  className="text-xs font-semibold px-5 py-2.5 rounded-xl border border-cream-200 dark:border-white/10 hover:border-brand-400/30 text-dark-800/60 dark:text-white/50 hover:text-brand-400 dark:hover:text-white transition-colors"
                >
                  Skip Question
                </button>
              </motion.div>
            )
          })()}

          {/* STEP 4: Overall Rating & Comments */}
          {step === 4 && (
            <motion.form
              key="step-review"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex-1 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-brand-400 mb-1 block">
                    Final Step
                  </span>
                  <h2 className="text-2xl font-bold text-dark-800 dark:text-white">
                    Overall Experience
                  </h2>
                  <p className="text-xs text-dark-800/40 dark:text-white/40 mt-1">
                    How would you rate the site as a whole?
                  </p>
                </div>

                {/* Main Rating Star Picker */}
                <div className="flex justify-center gap-3 py-2">
                  {[1, 2, 3, 4, 5].map(star => {
                    const displayRating = overallHover || overallRating
                    return (
                      <motion.button
                        key={star}
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setOverallRating(star)}
                        onMouseEnter={() => setOverallHover(star)}
                        onMouseLeave={() => setOverallHover(0)}
                        aria-label={`Rate ${star} stars overall`}
                        className="outline-none"
                      >
                        <Star
                          size={38}
                          weight={displayRating >= star ? 'fill' : 'regular'}
                          className={
                            displayRating >= star
                              ? 'text-brand-400 drop-shadow-[0_0_8px_rgba(212,130,10,0.4)]'
                              : 'text-cream-200 dark:text-white/10'
                          }
                        />
                      </motion.button>
                    )
                  })}
                </div>

                {/* Text Comments */}
                <div className="space-y-1.5">
                  <label htmlFor="comments" className="text-xs font-bold text-dark-800/60 dark:text-white/60 uppercase tracking-wide">
                    Comments or Suggestions
                  </label>
                  <textarea
                    id="comments"
                    rows={3}
                    placeholder="Tell us what you liked, or how we can do better..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full border border-cream-200 dark:border-white/10 focus:border-brand-400 dark:focus:border-brand-400 rounded-2xl p-4 text-sm bg-cream-50/50 dark:bg-dark-900/50 focus:bg-white text-dark-800 dark:text-white outline-none transition-all resize-none"
                  />
                </div>

                {/* User Info Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-bold text-dark-800/60 dark:text-white/60 uppercase tracking-wide">
                      Your Name (Optional)
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full border border-cream-200 dark:border-white/10 focus:border-brand-400 dark:focus:border-brand-400 rounded-xl px-4 py-3 text-sm bg-cream-50/50 dark:bg-dark-900/50 focus:bg-white text-dark-800 dark:text-white outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold text-dark-800/60 dark:text-white/60 uppercase tracking-wide">
                      Your Email (Optional)
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="e.g. john@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full border border-cream-200 dark:border-white/10 focus:border-brand-400 dark:focus:border-brand-400 rounded-xl px-4 py-3 text-sm bg-cream-50/50 dark:bg-dark-900/50 focus:bg-white text-dark-800 dark:text-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-cream-100 dark:border-white/5 flex gap-3">
                <button
                  type="submit"
                  disabled={overallRating === 0 || submitting}
                  className="flex-1 bg-brand-400 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-md shadow-brand-400/20 flex items-center justify-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </motion.form>
          )}

          {/* STEP 5: Success Screen */}
          {step === 5 && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center gap-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 10 }}
                className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-lg shadow-green-500/5"
              >
                <Trophy size={40} weight="duotone" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-display font-bold text-dark-800 dark:text-white">
                  Thank you! 💛
                </h2>
                <p className="text-sm text-dark-800/60 dark:text-white/50 mt-3 max-w-sm mx-auto leading-relaxed">
                  Your feedback has been successfully submitted. We review all responses to continuously refine catalog features.
                </p>
              </div>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 text-dark-800 dark:text-white font-semibold px-6 py-3 rounded-xl transition-colors mt-2"
              >
                Return Home
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
