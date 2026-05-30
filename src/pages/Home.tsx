import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkle,
  Lightning,
  ShoppingBagOpen,
  CaretDown,
  Envelope,
  WhatsappLogo,
  Phone,
  WarningOctagon,
  InstagramLogo,
  ChatCircleText,
  Star,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ui/ProductCard'
import ProductCoverflow from '../components/ui/ProductCoverflow'
import ProceduralHero from '../components/ui/ProceduralHero'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'

export default function Home() {
  const { data: featured } = useProducts({ featured: true })
  const { data: newProducts } = useNewProducts(7)
  const { data: allProducts } = useProducts()
  const showcase = useMemo(() => (allProducts ?? []).slice(0, 14), [allProducts])
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()

  // Hero carousel: cycle through admin-uploaded hero images if any. With none
  // configured we render a procedural theme-aware hero instead, so brand-new
  // stores still look polished and the visual re-tints when the user picks a
  // different theme.
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
  const currentHero = heroSources[heroIdx] ?? heroSources[0]

  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
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
    const { supabase } = await import('../lib/supabase')
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
      {/* Cinematic Hero */}
      <section className="relative min-h-[100dvh] flex items-end overflow-hidden bg-dark-900 -mt-16">
        {/* Background image with Ken Burns drift + carousel crossfade */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={reduceMotion ? { scale: 1 } : { scale: 1.08 }}
          animate={reduceMotion ? { scale: 1 } : { scale: [1.08, 1, 1.08] }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 22, ease: 'easeInOut', repeat: Infinity }
          }
        >
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`hero-${heroIdx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {usingCustomHero ? (
                <img
                  src={currentHero}
                  alt=""
                  role="presentation"
                  className="w-full h-full object-cover object-[50%_25%] sm:object-center"
                  loading={heroIdx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  {...(heroIdx === 0 ? { fetchPriority: 'high' as 'high' } : {})}
                />
              ) : (
                <ProceduralHero />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Carousel dot indicators */}
        {heroSources.length > 1 && (
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
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

        {/* Heavy vignette + warm rim-light glows only make sense over a real
            photo. The procedural hero ships with its own (lighter, theme-
            aware) washes inside ProceduralHero. */}
        {usingCustomHero && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-[560px] h-[560px] bg-brand-400/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 -left-24 w-[320px] h-[320px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        {/* Text - lower-left editorial composition */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pb-28 sm:pb-24 lg:pb-32">
          <div className="max-w-2xl">
            {/* Hairline rule + label */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.05 }}
              className="flex items-center gap-3 mb-5 sm:mb-7"
            >
              <span className="block h-px w-10 bg-brand-400" />
              <span className="text-brand-400 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-semibold">
                New Season - Now Live
              </span>
            </motion.div>

            {/* Headline - letter-by-letter wave, shimmer scoped to "Cyrus" */}
            <h1 className="font-display font-bold leading-[1.05] tracking-tight mb-5 sm:mb-7 text-white text-[2rem] sm:text-5xl lg:text-6xl xl:text-7xl max-w-md sm:max-w-xl text-wrap-balance">
              {(() => {
                const tagline = settings.tagline || 'Discover Amazing Products Brought to you By Cyrus'
                const accent = 'Cyrus'
                const idx = tagline.lastIndexOf(accent)
                const hasAccent = idx >= 0
                const beforeRaw = hasAccent ? tagline.slice(0, idx) : tagline
                const accentWord = hasAccent ? tagline.slice(idx) : ''
                const baseDelay = 0.55
                const charDelay = reduceMotion ? 0 : 0.028
                const beforeWords = beforeRaw.split(/\s+/).filter(Boolean)
                let charIdx = 0
                return (
                  <>
                    {beforeWords.map((word, wi) => {
                      const isLast = wi === beforeWords.length - 1 && !hasAccent
                      return (
                        <span key={`g-${wi}`}>
                          <span className="inline-block whitespace-nowrap">
                            {[...word].map(char => {
                              const i = charIdx++
                              return (
                                <motion.span
                                  key={i}
                                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 36, filter: 'blur(8px)' }}
                                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                                  transition={{
                                    duration: reduceMotion ? 0.3 : 0.55,
                                    ease: [0.22, 1, 0.36, 1],
                                    delay: baseDelay + i * charDelay,
                                  }}
                                  className="inline-block will-change-transform"
                                >
                                  {char}
                                </motion.span>
                              )
                            })}
                          </span>
                          {!isLast && ' '}
                        </span>
                      )
                    })}
                    {hasAccent && (
                      <motion.span
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 36, filter: 'blur(10px)' }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                          duration: reduceMotion ? 0.3 : 0.85,
                          ease: [0.22, 1, 0.36, 1],
                          delay: baseDelay + charIdx * charDelay + 0.18,
                        }}
                        className="inline-block whitespace-nowrap text-shimmer"
                      >
                        {accentWord}
                      </motion.span>
                    )}
                  </>
                )
              })()}
            </h1>

            {/* Subhead */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.55 }}
              className="text-white/80 text-sm sm:text-base lg:text-lg max-w-lg mb-8 sm:mb-10 leading-relaxed"
            >
              Shop the finest selection, curated just for you. Fast delivery, great prices, premium quality.
            </motion.p>

            {/* CTAs - bouncy liquid buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.78 }}
              className="flex items-center gap-3 sm:gap-4 flex-wrap"
            >
              {/* Primary liquid amber */}
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.03, y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                className="inline-block"
              >
                <Link
                  to="/shop"
                  className="group relative overflow-hidden inline-flex items-center gap-2.5 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-white font-semibold text-sm sm:text-base shadow-[0_10px_40px_-10px_rgba(212,130,10,0.7),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.15)]"
                >
                  {/* Sheen sweep on hover */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full" />
                  <span className="relative">Shop Now</span>
                  <ArrowRight size={16} weight="bold" className="relative transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              {/* Secondary liquid glass */}
              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.03, y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                className="inline-block"
              >
                <Link
                  to="/shop"
                  className="group relative inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150 border border-white/20 text-white font-medium text-sm sm:text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_30px_rgba(0,0,0,0.15)] hover:bg-white/[0.14] hover:border-white/30 transition-colors duration-300"
                >
                  Browse categories
                  <ArrowRight size={14} weight="bold" className="opacity-80 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue - desktop only (mobile bottom-nav covers this area) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden lg:flex flex-col items-center gap-3"
        >
          <span className="text-white/55 text-[9px] uppercase tracking-[0.42em] font-medium">Scroll</span>
          <motion.div
            animate={reduceMotion ? {} : { y: [0, 6, 0] }}
            transition={reduceMotion ? {} : { duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
            className="w-9 h-9 rounded-full border border-white/30 backdrop-blur-sm flex items-center justify-center"
          >
            <CaretDown size={12} weight="bold" className="text-white/75" />
          </motion.div>
        </motion.div>
      </section>

      {/* Coverflow showcase */}
      {showcase.length > 0 && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-16 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShoppingBagOpen size={14} weight="fill" className="text-brand-400" />
              <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">In the Shop</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white underline-gradient inline-block">
              Browse the Collection
            </h2>
            <p className="text-dark-800/50 dark:text-white/40 text-sm mt-4">Tap a card to open it — hover to pause.</p>
          </div>
          <div className="max-w-5xl mx-auto px-4">
            <ProductCoverflow products={showcase} />
          </div>
        </motion.section>
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
                  <div className="flex items-center gap-1 rounded-2xl border border-cream-200 dark:border-white/10 bg-white dark:bg-dark-700 px-2 py-1.5">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1
                      const active = value <= reviewRating
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          className="group p-2 -m-0.5 rounded-xl active:bg-brand-400/10 transition-colors"
                          aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={20}
                            className={`transition-all duration-200 ${active ? 'text-brand-400 fill-brand-400' : 'text-dark-800/30 dark:text-white/30 group-hover:text-brand-400 group-hover:scale-110'}`}
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
      {(!featured || featured.length === 0) && (!newProducts || newProducts.length === 0) && (
        <section className="max-w-7xl mx-auto px-4 py-32 text-center">
          <ShoppingBagOpen size={64} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">Coming Soon</h2>
          <p className="text-dark-800/50 dark:text-white/50">Products are being added. Check back soon!</p>
        </section>
      )}
    </main>
  )
}
