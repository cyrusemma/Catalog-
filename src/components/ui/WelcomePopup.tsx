import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Storefront, Sparkle, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useProducts, useNewProducts, useCategoryTree } from '../../hooks/useProducts'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { formatPrice, activeFlashSalePrice } from '../../lib/utils'
import type { Category, Product } from '../../types'

const MAX_CARDS = 8
const AUTOPLAY_MS = 3500

/**
 * Resolve the shop-page URL for a product's category. Sub-categories nest
 * under their parent slug; orphan rows fall back to a search by category name.
 */
function categoryHrefForProduct(product: Product, tree: Category[] | undefined): string {
  if (!tree || !product.category_id) {
    return product.category ? `/shop?q=${encodeURIComponent(product.category)}` : '/shop'
  }
  const cat = tree.find(c => c.id === product.category_id)
  if (!cat) return product.category ? `/shop?q=${encodeURIComponent(product.category)}` : '/shop'
  if (cat.parent_id) {
    const parent = tree.find(c => c.id === cat.parent_id)
    if (parent) return `/shop/${parent.slug}/${cat.slug}`
  }
  return `/shop/${cat.slug}`
}

/**
 * Welcome popup. A coverflow-style carousel slides featured/newest products
 * through the centre; tapping the front card jumps to that product's category
 * page, tapping a peeking neighbour brings it to the front first so the
 * visitor can read it before committing. Opens on every page load. Dismissing
 * it (close X, backdrop tap, skip, card pick) hides it for the rest of the
 * session — but the next refresh shows it again.
 */
export default function WelcomePopup() {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const navigate = useNavigate()
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()
  const { data: featured } = useProducts({ featured: true })
  const { data: fresh } = useNewProducts(30)
  const { data: categoryTree } = useCategoryTree()

  // Featured first, fall back to newest. Cap the deck so neighbours can stay
  // legible and we don't render dozens of off-screen cards.
  const items: Product[] = useMemo(() => {
    const pool = (featured && featured.length > 0 ? featured : (fresh ?? [])) as Product[]
    return pool.slice(0, MAX_CARDS)
  }, [featured, fresh])

  // Open once products have loaded. Showing an empty carousel isn't worth the
  // friction, so we wait quietly until there's something to slide. Mounted
  // inside StorefrontLayout, this runs once per fresh page load.
  useEffect(() => {
    if (items.length === 0) return
    const id = window.setTimeout(() => setOpen(true), 600)
    return () => window.clearTimeout(id)
  }, [items.length])

  // Autoplay: advance to the next slide on a steady cadence. Pauses while the
  // user is hovering/touching a card so they can read it.
  useEffect(() => {
    if (!open || paused || reduceMotion || items.length <= 1) return
    const id = window.setInterval(() => {
      setActiveIndex(i => (i + 1) % items.length)
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [open, paused, reduceMotion, items.length])

  const dismiss = () => setOpen(false)

  const skip = () => dismiss()

  // Signed shortest-path distance on the ring of cards, so the slideshow wraps
  // smoothly through both edges.
  const signedDelta = (i: number) => {
    const n = items.length
    if (n === 0) return 0
    let d = i - activeIndex
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    return d
  }

  const activate = (i: number) => {
    if (i === activeIndex) {
      const product = items[i]
      dismiss()
      navigate(categoryHrefForProduct(product, categoryTree))
      return
    }
    setActiveIndex(i)
  }

  const next = () => setActiveIndex(i => (i + 1) % Math.max(items.length, 1))
  const prev = () => setActiveIndex(i => (i - 1 + items.length) % Math.max(items.length, 1))

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/70 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome"
          onClick={skip}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-br from-dark-800 via-dark-900 to-black border border-brand-400/25 shadow-[0_40px_120px_-30px_rgba(212,130,10,0.45)] overflow-hidden"
          >
            {/* Soft amber glow accents */}
            <div className="pointer-events-none absolute -top-32 -right-24 w-[420px] h-[420px] bg-brand-400/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 w-[360px] h-[360px] bg-brand-500/15 rounded-full blur-3xl" />

            {/* Close */}
            <button
              type="button"
              onClick={skip}
              aria-label="Close welcome"
              className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            >
              <X size={16} weight="bold" />
            </button>

            <div className="relative px-5 sm:px-8 pt-8 pb-7">
              {/* Header */}
              <div className="text-center mb-2 relative z-10">
                <div className="inline-flex items-center gap-2 mb-3">
                  {settings.logo_url ? (
                    <span className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-brand-400/40">
                      <img src={settings.logo_url} alt="" className="w-full h-full object-cover" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center">
                      <Storefront size={11} weight="fill" className="text-white" />
                    </span>
                  )}
                  <Sparkle size={14} weight="fill" className="text-brand-400" />
                  <span className="text-brand-400 text-[11px] uppercase tracking-[0.32em] font-semibold">
                    Welcome
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-white leading-tight">
                  Step into Cyrus Catalog
                </h2>
                <p className="text-white/55 text-sm mt-2 max-w-md mx-auto">
                  Tap any card to jump straight into its category.
                </p>
              </div>

              {/* Coverflow carousel */}
              <div
                className="relative mx-auto my-6 h-[280px] sm:h-[340px] [perspective:1200px]"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
                role="group"
                aria-roledescription="carousel"
                aria-label="Featured products"
              >
                <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
                  {items.map((p, i) => {
                    const delta = signedDelta(i)
                    const abs = Math.abs(delta)
                    const dir = Math.sign(delta)
                    // Three peek layers per side so the visitor can see what's
                    // queued up on both sides while the slideshow advances.
                    const visible = abs <= 3
                    // Lateral slide + tilt + a gentle downward arch so the row
                    // curves like a wave instead of a flat strip. Active card
                    // stays on the baseline; sides dip below it.
                    const xPct = abs === 1 ? 56 : abs === 2 ? 96 : abs === 3 ? 132 : 0
                    const x = `${dir * xPct}%`
                    const scale = abs === 0 ? 1 : abs === 1 ? 0.8 : abs === 2 ? 0.64 : 0.5
                    const opacity = abs === 0 ? 1 : abs === 1 ? 0.6 : abs === 2 ? 0.3 : 0.12
                    const rotateY = -dir * (abs === 1 ? 16 : abs === 2 ? 26 : abs === 3 ? 34 : 0)
                    const y = abs * 12
                    const z = 30 - abs * 7
                    const image = p.images?.[0] || 'https://placehold.co/320x420/1a1008/d4820a?text=•'
                    const flash = activeFlashSalePrice(p)
                    const price = flash ?? p.selling_price

                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => activate(i)}
                        aria-label={
                          i === activeIndex
                            ? `Open the ${p.category || 'shop'} category`
                            : `Bring ${p.title} to the front`
                        }
                        aria-current={i === activeIndex ? 'true' : undefined}
                        initial={false}
                        animate={{ x, y, scale, opacity: visible ? opacity : 0, rotateY, zIndex: z }}
                        // Spring with a gentle settle gives the motion that
                        // "wavy" feel — cards arrive at their new spot, ease
                        // in, and breathe. Opacity stays on a tween so fading
                        // edges don't bounce.
                        transition={{
                          type: 'spring',
                          stiffness: 95,
                          damping: 20,
                          mass: 0.9,
                          opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                        }}
                        whileTap={i === activeIndex ? { scale: 0.97 } : undefined}
                        // Hide off-screen cards from the tab order so keyboard
                        // users only land on what's actually visible.
                        tabIndex={visible ? 0 : -1}
                        style={{ pointerEvents: visible ? 'auto' : 'none' }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] sm:w-[220px] aspect-[3/4] rounded-3xl overflow-hidden bg-white/5 border border-white/15 backdrop-blur-md shadow-[0_30px_60px_-25px_rgba(0,0,0,0.85)] hover:border-brand-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
                      >
                        <img
                          src={image}
                          alt={p.title}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                        {/* Flash sale tag floats on the active card to draw the eye */}
                        {i === activeIndex && flash != null && (
                          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full animate-pulse">
                            <Sparkle size={9} weight="fill" /> Flash
                          </span>
                        )}

                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-left">
                          <p className="text-brand-400 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] line-clamp-1">
                            {p.category || 'Shop'}
                          </p>
                          <p className="text-white text-sm sm:text-base font-semibold line-clamp-2 mt-0.5">
                            {p.title}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`text-sm sm:text-base font-bold tabular-nums ${flash != null ? 'text-red-300' : 'text-brand-400'}`}>
                              {formatPrice(price)}
                            </span>
                            {flash != null && (
                              <span className="text-white/40 text-[11px] line-through">
                                {formatPrice(p.selling_price)}
                              </span>
                            )}
                          </div>
                          {i === activeIndex && (
                            <p className="text-white/60 text-[11px] mt-2">Tap to open this category →</p>
                          )}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Manual prev/next chevrons for accessibility + impatient fingers */}
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Previous"
                      className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/15"
                    >
                      <CaretLeft size={14} weight="bold" />
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      aria-label="Next"
                      className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/15"
                    >
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </>
                )}
              </div>

              {/* Pagination dots */}
              {items.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  {items.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Show slide ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeIndex ? 'w-6 bg-brand-400' : 'w-1.5 bg-white/25 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={skip}
                  className="text-white/55 hover:text-brand-400 text-xs font-medium transition-colors"
                >
                  Skip and browse everything →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
