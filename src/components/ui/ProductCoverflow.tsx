import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretLeft, CaretRight, Clock, Lightning } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { activeFlashSalePrice, formatPrice } from '../../lib/utils'
import { useSwipe } from '../../hooks/useSwipe'
import type { Product } from '../../types'

interface Props {
  products: Product[]
  /** Milliseconds between auto-advances. Set 0 to disable autoplay. */
  autoplayMs?: number
}

// Lateral offsets per layer, expressed as % of card width.
const GAP_NEAR = 58
const GAP_MID = 100
const GAP_FAR = 138

// Downward arch — each step out drops a bit so the row curves like a gentle
// wave instead of sitting in a flat line.
const ARCH_PX = 14
// Tilt away from centre per layer (deg). Higher = more pronounced 3D.
const TILT_NEAR = 16
const TILT_MID = 26
const TILT_FAR = 34

/**
 * Coverflow-style product carousel. The active card sits front-and-centre at
 * full scale; neighbours peek out behind it, tilted away. Every few seconds
 * the front card slides left and the next one rises to the middle. Tapping
 * the front card opens the product; tapping a peeking neighbour brings it to
 * the front so the visitor can preview it before committing.
 */
export default function ProductCoverflow({ products, autoplayMs = 4000 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()

  // Reset to the first card whenever the underlying list changes — avoids the
  // active pointer hanging off the end if a product is published/unpublished.
  useEffect(() => {
    setActiveIndex(0)
  }, [products.length])

  useEffect(() => {
    if (autoplayMs <= 0 || paused || reduceMotion || products.length <= 1) return
    const id = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % products.length)
    }, autoplayMs)
    return () => window.clearInterval(id)
  }, [autoplayMs, paused, reduceMotion, products.length])

  if (!products || products.length === 0) return null

  // Signed shortest-path distance on the ring of cards so the slideshow wraps
  // through both edges without a jarring snap-back.
  const signedDelta = (i: number) => {
    const n = products.length
    let d = i - activeIndex
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    return d
  }

  const next = () => setActiveIndex(i => (i + 1) % products.length)
  const prev = () => setActiveIndex(i => (i - 1 + products.length) % products.length)

  // Drag/swipe across the carousel — finger sweep right (positive dx) shows
  // the previous card, sweep left shows the next, matching natural feel.
  const swipe = useSwipe({ onSwipeLeft: next, onSwipeRight: prev, threshold: 40 })

  return (
    <div className="relative">
      <div
        // Perspective container so rotateY on neighbours reads as 3D rather
        // than flat shrink. touch-pan-y tells mobile that vertical scroll is
        // ours but horizontal swipes belong to the carousel.
        className="relative mx-auto h-[360px] sm:h-[440px] [perspective:1400px] touch-pan-y"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        {...swipe}
        role="group"
        aria-roledescription="carousel"
        aria-label="Browse the collection"
      >
        <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
          {products.map((p, i) => {
            const delta = signedDelta(i)
            const abs = Math.abs(delta)
            const dir = Math.sign(delta)
            // Three peek layers per side so the queue ahead/behind is visible.
            // Past the third step out, cards fade away entirely.
            const visible = abs <= 3
            const isActive = abs === 0

            const xPct = abs === 1 ? GAP_NEAR : abs === 2 ? GAP_MID : abs === 3 ? GAP_FAR : 0
            const x = `${dir * xPct}%`
            const scale = abs === 0 ? 1 : abs === 1 ? 0.82 : abs === 2 ? 0.66 : 0.52
            const opacity = abs === 0 ? 1 : abs === 1 ? 0.6 : abs === 2 ? 0.3 : 0.12
            const tiltDeg = abs === 1 ? TILT_NEAR : abs === 2 ? TILT_MID : abs === 3 ? TILT_FAR : 0
            const rotateY = -dir * tiltDeg
            // Downward arch — sides dip below the active card so the row reads
            // as a wave, not a strip. The active card stays on the baseline.
            const y = abs * ARCH_PX
            const z = 30 - abs * 8

            const image = p.images?.[0] || 'https://placehold.co/480x640/1a1008/d4820a?text=•'
            const flash = activeFlashSalePrice(p)
            const onFlashSale = flash != null
            const displayPrice = flash ?? p.selling_price

            // The active card is a real link so middle-click / right-click /
            // long-press all work. Neighbours are buttons that just promote
            // themselves to centre — clicking them shouldn't navigate.
            const common = {
              key: p.id,
              'aria-hidden': !visible || undefined,
              tabIndex: visible ? 0 : -1,
              style: { pointerEvents: visible ? 'auto' as const : 'none' as const },
              className:
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] sm:w-[280px] aspect-[3/4] rounded-3xl overflow-hidden bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55)] hover:shadow-[0_30px_60px_-15px_rgba(212,130,10,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60',
            }
            const innerAnim = {
              initial: false as const,
              animate: { x, y, scale, opacity: visible ? opacity : 0, rotateY, zIndex: z },
              // Spring with a gentle settle gives the motion that "wavy" feel —
              // cards arrive at their new spot, ease into it, and breathe.
              // rotateY uses the same spring so the tilt waves in too.
              transition: {
                type: 'spring' as const,
                stiffness: 95,
                damping: 20,
                mass: 0.9,
                opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
              },
            }

            const Content = (
              <>
                <img
                  src={image}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  {onFlashSale && (
                    <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Lightning size={9} weight="fill" /> Flash
                    </span>
                  )}
                  {p.is_preorder && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock size={9} weight="fill" /> Preorder
                    </span>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-left">
                  <p className="text-brand-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] line-clamp-1">
                    {p.category || 'Shop'}
                  </p>
                  <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-2 mt-0.5">
                    {p.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`text-base sm:text-lg font-bold tabular-nums ${onFlashSale ? 'text-red-300' : 'text-brand-400'}`}>
                      {formatPrice(displayPrice)}
                    </span>
                    {onFlashSale && (
                      <span className="text-white/40 text-[11px] line-through">
                        {formatPrice(p.selling_price)}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )

            if (isActive) {
              return (
                <motion.div {...common} {...innerAnim}>
                  <Link to={`/product/${p.id}`} className="absolute inset-0" aria-label={`Open ${p.title}`}>
                    {Content}
                  </Link>
                </motion.div>
              )
            }

            return (
              <motion.button
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Bring ${p.title} to the front`}
                {...common}
                {...innerAnim}
              >
                {Content}
              </motion.button>
            )
          })}
        </div>

        {/* Manual prev/next */}
        {products.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous product"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-dark-800/80 hover:bg-white dark:hover:bg-dark-700 text-dark-800 dark:text-white flex items-center justify-center backdrop-blur-md border border-cream-200 dark:border-white/15 shadow-lg transition-colors"
            >
              <CaretLeft size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next product"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 dark:bg-dark-800/80 hover:bg-white dark:hover:bg-dark-700 text-dark-800 dark:text-white flex items-center justify-center backdrop-blur-md border border-cream-200 dark:border-white/15 shadow-lg transition-colors"
            >
              <CaretRight size={14} weight="bold" />
            </button>
          </>
        )}
      </div>

      {/* Pagination dots */}
      {products.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-7 bg-brand-400' : 'w-1.5 bg-dark-800/15 dark:bg-white/15 hover:bg-dark-800/30 dark:hover:bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
