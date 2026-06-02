import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkle,
  Lightning,
  ShoppingBagOpen,
  Envelope,
  WhatsappLogo,
  Phone,
  WarningOctagon,
  InstagramLogo,
  ChatCircleText,
  Star,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ui/ProductCard'
import HeroShowcase from '../components/ui/HeroShowcase'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { supabase } from '../lib/supabase'
import type { Product } from '../types'

// Single shared reveal — used for the staggered hero load.
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
}

// Splits the tagline so a trailing brand word (e.g. "Cyrus") can be accented.
function splitHeadline(tagline: string) {
  const accent = 'Cyrus'
  const idx = tagline.lastIndexOf(accent)
  if (idx < 0) return { before: tagline, accent: '' }
  return { before: tagline.slice(0, idx), accent: tagline.slice(idx) }
}

export default function Home() {
  const { data: featured, isError: featuredIsError, error: featuredError } = useProducts({ featured: true })
  const { data: newProducts, isError: newProductsIsError, error: newProductsError } = useNewProducts(7)
  const { isError: allProductsIsError, error: allProductsError } = useProducts()
  const productsError = allProductsError ?? featuredError ?? newProductsError
  const productsLoadFailed = allProductsIsError || featuredIsError || newProductsIsError
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()
  const headline = splitHeadline(settings.tagline || 'Discover Amazing Products Brought to you By Cyrus')

  // Hero product showcase — featured first, topped up with new arrivals, deduped.
  const heroShowcase = useMemo(() => {
    const seen = new Set<string>()
    const out: Product[] = []
    for (const p of [...(featured ?? []), ...(newProducts ?? [])]) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        out.push(p)
      }
    }
    return out.slice(0, 6)
  }, [featured, newProducts])

  // Hero carousel: cycle through admin-uploaded hero images if any. With none
  // configured we fall back to a theme-tinted gradient, so brand-new stores
  // still look polished and the visual re-tints when the user picks a theme.
  const heroSources = settings.hero_images ?? []
  const usingCustomHero = heroSources.length > 0
  const [heroIdx, setHeroIdx] = useState(0)
  useEffect(() => {
    if (heroSources.length <= 1 || reduceMotion) return
    const intervalMs = Math.max(2000, (settings.hero_rotation_seconds || 6) * 1000)
    const id = window.setInterval(() => {
      setHeroIdx(i => (i + 1) % heroSources.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [heroSources, settings.hero_rotation_seconds, reduceMotion])

  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewSending, setReviewSending] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [reviewError, setReviewError] = useState('')

  const contactItems = [
    { label: 'Email', value: 'cyrusadetu@gmail.com', href: 'mailto:cyrusadetu@gmail.com', Icon: Envelope },
    { label: 'WhatsApp', value: '0574090147', href: 'https://wa.me/233574090147', Icon: WhatsappLogo },
    { label: 'Call', value: '0599399983', href: 'tel:0599399983', Icon: Phone },
    { label: 'Complaints', value: 'Hot line', href: 'tel:0599399983', Icon: WarningOctagon },
    { label: 'Instagram', value: '@cyrus._.emma', href: 'https://instagram.com/cyrus._.emma', Icon: InstagramLogo },
  ]

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (reviewMessage.trim().length < 5) {
      setReviewError('Please write a short review or suggestion.')
      return
    }

    setReviewSending(true)
    const { error } = await supabase.from('site_reviews').insert({
      name: reviewName.trim() || null,
      rating: reviewRating,
      message: reviewMessage.trim(),
      page_url: window.location.href,
    })
    setReviewSending(false)

    if (error) {
      console.error('Review submit failed:', error)

      const backendMessage = (error.message || '').toLowerCase()

      // If the table doesn't exist on the remote DB, simulate success locally
      if (backendMessage.includes('relation "site_reviews" does not exist') || backendMessage.includes("could not find the table 'public.site_reviews'")) {
        try {
          const existing = JSON.parse(window.localStorage.getItem('mock_site_reviews') || '[]') as any[]
          const mockEntry = {
            id: `mock-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
            name: reviewName.trim() || null,
            rating: reviewRating,
            message: reviewMessage.trim(),
            page_url: window.location.href,
            created_at: new Date().toISOString(),
          }
          existing.unshift(mockEntry)
          window.localStorage.setItem('mock_site_reviews', JSON.stringify(existing))
          setReviewSuccess('Thanks. (Saved locally - database migration pending).')
          setReviewName('')
          setReviewRating(5)
          setReviewMessage('')
          return
        } catch (e) {
          // fall through to normal error message
          console.error('Failed to save mock review locally', e)
        }
      }

      if (backendMessage.includes('row-level security') || backendMessage.includes('permission denied')) {
        setReviewError('Supabase blocked the insert. Check the reviews RLS policy in the database.')
        return
      }

      setReviewError(`Could not send your review right now. ${error.message}`)
      return
    }

    setReviewSuccess('Thanks. Your review was sent successfully.')
    setReviewName('')
    setReviewRating(5)
    setReviewMessage('')
  }

  return (
    <main className="flex-1">
      {/* Hero — editorial split: copy + product showcase */}
      <section className="relative min-h-[92dvh] flex items-center overflow-hidden bg-dark-900 -mt-16 pt-20">
        {/* Background: hero photo carousel, or a theme-tinted gradient fallback */}
        <div aria-hidden="true" className="absolute inset-0">
          {usingCustomHero ? (
            heroSources.map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                role="presentation"
                className={`absolute inset-0 w-full h-full object-cover object-[50%_25%] sm:object-center transition-opacity duration-700 ease-out ${
                  i === heroIdx ? 'opacity-100' : 'opacity-0'
                }`}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                {...(i === 0 ? { fetchPriority: 'high' as 'high' } : {})}
              />
            ))
          ) : (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(120% 120% at 80% 0%, var(--hero-glow-a), transparent 55%),' +
                  'radial-gradient(100% 100% at 0% 100%, var(--hero-glow-b), transparent 50%),' +
                  'linear-gradient(160deg, var(--hero-bg-from), var(--hero-bg-via) 55%, var(--hero-bg-to))',
              }}
            />
          )}
        </div>

        {/* Legibility scrim — kept simple; reads well over photo and gradient alike */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent pointer-events-none" />

        {/* Carousel dots */}
        {heroSources.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {heroSources.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setHeroIdx(i)}
                aria-label={`Show hero image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === heroIdx ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Content — staggered reveal: copy on the left, product showcase right */}
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate={reduceMotion ? undefined : 'show'}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
          }}
          className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20 grid lg:grid-cols-2 gap-12 lg:gap-10 items-center"
        >
          {/* Copy */}
          <div className="max-w-xl">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
              <span className="block h-px w-10 bg-[var(--hero-accent)]" />
              <span className="text-[var(--hero-accent)] text-[10px] sm:text-xs uppercase tracking-[0.32em] font-semibold">
                New Season — Now Live
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display font-semibold leading-[1.04] tracking-[-0.02em] mb-6 text-white text-[2.4rem] sm:text-6xl lg:text-[4.2rem] text-wrap-balance"
            >
              {headline.before}
              {headline.accent && (
                <span className="italic font-light text-[var(--hero-accent)]">{headline.accent}</span>
              )}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-white/75 text-sm sm:text-base lg:text-lg max-w-md mb-9 leading-relaxed"
            >
              A considered selection, curated for you. Fast delivery, fair prices, pieces worth keeping.
            </motion.p>

            <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap">
              <Link
                to="/shop"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-dark-900 font-semibold text-sm sm:text-base transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Shop the collection
                <ArrowRight size={16} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/25 text-white font-medium text-sm sm:text-base hover:bg-white/10 transition-colors duration-200"
              >
                Browse categories
              </Link>
            </motion.div>
          </div>

          {/* Product showcase */}
          {heroShowcase.length > 0 && (
            <motion.div variants={fadeUp}>
              <HeroShowcase products={heroShowcase} />
            </motion.div>
          )}
        </motion.div>
      </section>

      {productsLoadFailed && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
            <p className="font-semibold">Products could not load.</p>
            <p className="mt-1 text-red-700/80 dark:text-red-200/80">
              {productsError instanceof Error ? productsError.message : 'Check the Supabase deployment environment variables.'}
            </p>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newProducts && newProducts.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-5 sm:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkle size={14} weight="fill" className="text-brand-400" />
                <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Just Dropped</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white sm:underline-gradient inline-block">
                New Arrivals
              </h2>
              <p className="hidden sm:block text-dark-800/50 dark:text-white/40 text-sm mt-4">Fresh products added this week</p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1 rounded-full bg-brand-400/10 text-brand-400 hover:bg-brand-400/15 text-xs sm:text-sm font-semibold px-3 py-1.5 transition-colors"
            >
              View all <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
          {/* Mobile = edge-to-edge swipe rail with snap. Desktop = grid. */}
          <div className="sm:max-w-7xl sm:mx-auto sm:px-4">
            <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible scrollbar-hide snap-x snap-mandatory px-4 sm:px-0 pb-2 sm:pb-0 -mx-0">
              {newProducts.slice(0, 8).map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-auto">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Featured */}
      {featured && featured.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-10 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-5 sm:mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightning size={14} weight="fill" className="text-brand-400" />
                <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Featured</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white sm:underline-gradient inline-block">
                Featured Products
              </h2>
              <p className="hidden sm:block text-dark-800/50 dark:text-white/40 text-sm mt-4">Hand-picked just for you</p>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1 rounded-full bg-brand-400/10 text-brand-400 hover:bg-brand-400/15 text-xs sm:text-sm font-semibold px-3 py-1.5 transition-colors"
            >
              View all <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
          <div className="sm:max-w-7xl sm:mx-auto sm:px-4">
            <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible scrollbar-hide snap-x snap-mandatory px-4 sm:px-0 pb-2 sm:pb-0">
              {featured.slice(0, 8).map((p, i) => (
                <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-auto">
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Reviews */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-7xl mx-auto px-4 py-10 sm:py-16"
      >
        <div className="flex items-center gap-2 mb-2">
          <ChatCircleText size={16} weight="duotone" className="text-brand-400" />
          <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Reviews</span>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="text-2xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white sm:underline-gradient inline-block">
              Send a site review
            </h2>
            <p className="hidden sm:block text-dark-800/50 dark:text-white/40 text-sm mt-4 max-w-2xl">
              Leave a rating and a short review. Your feedback will appear in the admin dashboard so I can improve the site.
            </p>

            <form onSubmit={handleReviewSubmit} className="mt-5 sm:mt-6 rounded-3xl border border-cream-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-md p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-4">
                <div className="flex-1">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-dark-800/60 dark:text-white/55 mb-2">Your name</label>
                  <input
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    placeholder="Optional"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-dark-800/60 dark:text-white/55 mb-2">Rating</label>
                  {/* Bigger tap targets on mobile — each star button gets its
                      own padding so thumbs can hit it without precision. */}
                  <div
                    className="flex items-center gap-1 rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-dark-700 px-2 py-1.5"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1
                      // Hover preview wins over the committed rating, so the row
                      // fills up to whichever star the thumb/cursor is on.
                      const shown = hoverRating || reviewRating
                      const active = value <= shown
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          onMouseEnter={() => setHoverRating(value)}
                          className="group relative p-2 -m-0.5 rounded-xl transition-transform duration-300 hover:scale-110"
                          aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                        >
                          {/* particle-explosion dots — pop above & below the star on hover */}
                          <span aria-hidden className="pointer-events-none absolute left-1/2 top-0.5 h-1.5 w-1.5 -translate-x-1/2 scale-0 rounded-full bg-brand-400 opacity-0 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-150 group-hover:opacity-100" />
                          <span aria-hidden className="pointer-events-none absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 scale-0 rounded-full bg-brand-400 opacity-0 transition-all duration-300 group-hover:translate-y-1.5 group-hover:scale-150 group-hover:opacity-100" />
                          <Star
                            size={20}
                            className={`relative transition-all duration-300 ${
                              active
                                ? 'text-brand-400 fill-brand-400 drop-shadow-[0_0_8px_rgba(212,130,10,0.7)] group-hover:drop-shadow-[0_0_12px_rgba(212,130,10,0.95)]'
                                : 'text-dark-800/30 dark:text-white/30'
                            } ${!hoverRating && value === reviewRating ? 'animate-star-pop' : ''}`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-dark-800/60 dark:text-white/55 mb-2">Your review</label>
                <textarea
                  value={reviewMessage}
                  onChange={e => setReviewMessage(e.target.value)}
                  rows={5}
                  placeholder="Tell us what you liked, what needs work, or an idea to improve the shop..."
                  className="input min-h-[140px] resize-none"
                />
              </div>

              {reviewError && <p className="text-sm text-red-500 mb-3">{reviewError}</p>}
              {reviewSuccess && <p className="text-sm text-green-600 mb-3">{reviewSuccess}</p>}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={reviewSending}
                  className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
                >
                  {reviewSending ? 'Sending...' : 'Send Review'}
                </button>
                <p className="text-[11px] sm:text-xs text-dark-800/45 dark:text-white/40">
                  By sending, you help improve the shop experience.
                </p>
              </div>
            </form>
          </div>

          {/* Brand-amber callout instead of a warm-brown card — pops cleanly
              on every theme (light, dark, amoled, rose-light, rose-dark)
              instead of fighting the rose palette. */}
          <div className="relative rounded-3xl text-white p-5 sm:p-7 shadow-[0_24px_80px_-30px_rgba(212,130,10,0.55)] overflow-hidden bg-gradient-to-br from-brand-500 via-brand-400 to-brand-500">
            {/* Soft inner glow */}
            <div className="pointer-events-none absolute -top-20 -right-16 w-[260px] h-[260px] bg-white/15 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 w-[220px] h-[220px] bg-black/15 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-white/85">
                <Envelope size={16} weight="duotone" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Contact</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-bold mb-2">Need to reach me directly?</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-5">
                These are the channels I'll also use to follow up on reviews and suggestions.
              </p>

              <div className="space-y-2">
                {contactItems.map((item) => {
                  const Icon = item.Icon
                  return (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                      className="group flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-3 text-white transition-colors"
                    >
                      <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white/25 flex items-center justify-center transition-colors">
                        <Icon className="h-4 w-4 text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] uppercase tracking-[0.2em] text-white/70">{item.label}</span>
                        <span className="block truncate text-sm font-semibold">{item.value}</span>
                      </div>
                      <ArrowRight size={14} className="text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                    </motion.a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Empty state */}
      {!productsLoadFailed && (!featured || featured.length === 0) && (!newProducts || newProducts.length === 0) && (
        <section className="max-w-7xl mx-auto px-4 py-32 text-center">
          <ShoppingBagOpen size={64} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">Coming Soon</h2>
          <p className="text-dark-800/50 dark:text-white/50">Products are being added. Check back soon!</p>
        </section>
      )}
    </main>
  )
}
