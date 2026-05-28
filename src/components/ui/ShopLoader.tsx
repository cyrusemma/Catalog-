import { useEffect, useState } from 'react'
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
  // Random starting line so each page-load feels fresh.
  const [lineIdx, setLineIdx] = useState(() => Math.floor(Math.random() * SHOPKEEPER_LINES.length))

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const timer = window.setInterval(() => {
      setLineIdx(i => (i + 1) % SHOPKEEPER_LINES.length)
    }, 2600)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div
      className="min-h-dvh bg-cream-50 dark:bg-dark-900 flex items-center justify-center px-6 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading store</span>
      <div className="max-w-md w-full text-center" aria-hidden="true">
        <div className="mb-7 flex justify-center animate-loader-mark-in motion-reduce:animate-none">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center shadow-amber-glow">
            <div className="animate-shop-sway motion-reduce:animate-none">
              <Storefront size={26} weight="duotone" className="text-white" />
            </div>
          </div>
        </div>

        <div className="min-h-[3.5rem] sm:min-h-[4rem] flex items-center justify-center">
          <p
            key={lineIdx}
            className="font-display text-lg sm:text-2xl leading-snug text-dark-800 dark:text-white px-2 animate-loader-line motion-reduce:animate-none"
          >
            {SHOPKEEPER_LINES[lineIdx]}
          </p>
        </div>

        <div className="flex justify-center items-center gap-1.5 mt-7 shop-loader-dots" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-loader-dot motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
