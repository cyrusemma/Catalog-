import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Storefront } from '@phosphor-icons/react'

const SHOPKEEPER_LINES = [
  "Hold on, I'm opening the shop…",
  "Let me grab the keys from my pocket…",
  "Wow, you're here early…",
  "Hope you're ready to buy everything in here…",
  "Just turning on the lights…",
  "Straightening the shelves…",
  "Brewing some coffee… want some?",
  "Today's specials are looking good…",
  "Pulling out the new arrivals…",
  "Almost ready for you…",
]

export default function ShopLoader() {
  const reduceMotion = useReducedMotion()
  // Random starting line so each page-load feels fresh
  const [lineIdx, setLineIdx] = useState(() => Math.floor(Math.random() * SHOPKEEPER_LINES.length))

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      setLineIdx(i => (i + 1) % SHOPKEEPER_LINES.length)
    }, 2600)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  return (
    <div className="min-h-dvh bg-cream-50 dark:bg-dark-900 flex items-center justify-center px-6 overflow-hidden">
      <div className="max-w-md w-full text-center">
        {/* Small brand mark with subtle drift */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-7 flex justify-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-amber-glow">
            <motion.div
              animate={reduceMotion ? {} : { rotate: [-6, 6, -6] }}
              transition={reduceMotion ? {} : { duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
            >
              <Storefront size={26} weight="duotone" className="text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Rotating shopkeeper line */}
        <div className="min-h-[3.5rem] sm:min-h-[4rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIdx}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="font-display text-lg sm:text-2xl leading-snug text-dark-800 dark:text-white px-2"
            >
              {SHOPKEEPER_LINES[lineIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Three-dot pulse — the only continuous "loading" cue */}
        <div className="flex justify-center items-center gap-1.5 mt-7" aria-label="Loading">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              animate={reduceMotion ? {} : { opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
              transition={reduceMotion ? {} : { duration: 1.3, ease: 'easeInOut', repeat: Infinity, delay: i * 0.18 }}
              className="w-1.5 h-1.5 rounded-full bg-brand-400"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
