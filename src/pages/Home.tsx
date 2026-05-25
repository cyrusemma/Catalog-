import { Link } from 'react-router-dom'
import { ArrowRight, Sparkle, Lightning, ShoppingBagOpen, CaretDown } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import ProductCard from '../components/ui/ProductCard'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'
import heroLandscape from '../assets/hero-landscape.jpg'
import heroPortrait from '../assets/hero-portrait.jpg'

export default function Home() {
  const { data: featured } = useProducts({ featured: true })
  const { data: newProducts } = useNewProducts(7)
  const settings = useStoreSettings()
  const reduceMotion = useReducedMotion()

  return (
    <main className="flex-1">
      {/* Cinematic Hero */}
      <section className="relative min-h-[100dvh] flex items-end overflow-hidden bg-dark-900 -mt-16">
        {/* Background image with Ken Burns drift */}
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
          <picture>
            <source media="(min-width: 641px)" srcSet={heroLandscape} />
            <img
              src={heroPortrait}
              alt=""
              role="presentation"
              className="w-full h-full object-cover object-[50%_18%] sm:object-center"
              fetchPriority="high"
            />
          </picture>
        </motion.div>

        {/* Cinematographer's vignette: bottom wash + left wash */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Soft amber glow echoing the rim-light in the photo */}
        <div className="absolute -top-32 -right-32 w-[560px] h-[560px] bg-brand-400/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-24 w-[320px] h-[320px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Text — lower-left editorial composition */}
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
                New Season — Now Live
              </span>
            </motion.div>

            {/* Headline — letter-by-letter wave, shimmer scoped to "Cyrus" */}
            <h1 className="font-display font-bold leading-[1.02] tracking-tight mb-5 sm:mb-7 text-white text-[2.25rem] sm:text-5xl lg:text-6xl xl:text-7xl max-w-md sm:max-w-lg">
              {(() => {
                const tagline = settings.tagline || 'Discover Amazing Products Brought to you By Cyrus'
                const accent = 'Cyrus'
                const idx = tagline.lastIndexOf(accent)
                const hasAccent = idx >= 0
                const before = hasAccent ? tagline.slice(0, idx) : tagline
                const accentWord = hasAccent ? tagline.slice(idx) : ''
                const baseDelay = 0.55
                const charDelay = reduceMotion ? 0 : 0.028
                return (
                  <>
                    {before.split('').map((char, i) => (
                      <motion.span
                        key={`b-${i}`}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 36, filter: 'blur(8px)' }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                          duration: reduceMotion ? 0.3 : 0.55,
                          ease: [0.22, 1, 0.36, 1],
                          delay: baseDelay + i * charDelay,
                        }}
                        className="inline-block will-change-transform"
                      >
                        {char === ' ' ? ' ' : char}
                      </motion.span>
                    ))}
                    {hasAccent && (
                      <motion.span
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 36, filter: 'blur(10px)' }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{
                          duration: reduceMotion ? 0.3 : 0.85,
                          ease: [0.22, 1, 0.36, 1],
                          delay: baseDelay + before.length * charDelay + 0.18,
                        }}
                        className="inline-block text-shimmer"
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

            {/* CTAs — bouncy liquid buttons */}
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

        {/* Scroll cue — desktop only (mobile bottom-nav covers this area) */}
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

      {/* New Arrivals */}
      {newProducts && newProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkle size={14} weight="fill" className="text-brand-400" />
                <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Just Dropped</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white underline-gradient inline-block">
                New Arrivals
              </h2>
              <p className="text-dark-800/50 dark:text-white/40 text-sm mt-4">Fresh products added this week</p>
            </div>
            <Link to="/shop" className="text-brand-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {newProducts.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightning size={14} weight="fill" className="text-brand-400" />
                <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Featured</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white underline-gradient inline-block">
                Featured Products
              </h2>
              <p className="text-dark-800/50 dark:text-white/40 text-sm mt-4">Hand-picked just for you</p>
            </div>
            <Link to="/shop" className="text-brand-400 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View All <ArrowRight size={14} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featured.slice(0, 8).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}

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
