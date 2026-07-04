import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ShoppingBagOpen,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import ProductCard from '../components/ui/ProductCard'
import CustomerReviews from '../components/ui/CustomerReviews'
import HeroShowcase from '../components/ui/HeroShowcase'
import SlideGlassButton from '../components/ui/SlideGlassButton'
import { useProducts, useNewProducts } from '../hooks/useProducts'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Product } from '../types'
import Image from '../components/ui/Image'

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
  useDocumentTitle('Home')
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


  return (
    <main className="flex-1">
      {/* Hero — editorial split: copy + product showcase */}
      <section className="relative min-h-[92dvh] flex items-center overflow-hidden bg-dark-900 -mt-16 pt-20">
        {/* Background: hero photo carousel, or a theme-tinted gradient fallback */}
        <div aria-hidden="true" className="absolute inset-0">
          {usingCustomHero ? (
            heroSources.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt=""
                role="presentation"
                className={`absolute inset-0 w-full h-full object-[50%_25%] sm:object-center transition-opacity duration-700 ease-out ${i === heroIdx ? 'opacity-100' : 'opacity-0'
                  }`}
                priority={i === 0}
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
                className={`h-1.5 rounded-full transition-all ${i === heroIdx ? 'w-8 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'
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
              <SlideGlassButton to="/shop">
                Shop the collection
              </SlideGlassButton>
              <SlideGlassButton to="/shop">
                Browse categories
              </SlideGlassButton>
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
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="block text-[var(--hero-accent)] text-[11px] uppercase tracking-[0.28em] font-semibold mb-2.5">
                Just Dropped
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                New Arrivals
              </h2>
            </div>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-dark-800/70 dark:text-white/70 hover:text-[var(--hero-accent)] transition-colors"
            >
              View all <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          {/* Mobile = edge-to-edge swipe rail with snap. Desktop = grid. */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {newProducts.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
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
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between mb-6 sm:mb-10">
            <div>
              <span className="block text-[var(--hero-accent)] text-[11px] uppercase tracking-[0.28em] font-semibold mb-2.5">
                Featured
              </span>
              <h2 className="text-3xl sm:text-5xl font-display font-semibold tracking-[-0.02em] text-dark-800 dark:text-white">
                Featured Products
              </h2>
            </div>
            <Link
              to="/shop"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-dark-800/70 dark:text-white/70 hover:text-[var(--hero-accent)] transition-colors"
            >
              View all <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {featured.slice(0, 8).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </motion.section>
      )}



      {/* Empty state */}
      {!productsLoadFailed && (!featured || featured.length === 0) && (!newProducts || newProducts.length === 0) && (
        <section className="max-w-7xl mx-auto px-4 py-32 text-center">
          <ShoppingBagOpen size={64} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-2">Coming Soon</h2>
          <p className="text-dark-800/50 dark:text-white/50">Products are being added. Check back soon!</p>
        </section>
      )}

      <CustomerReviews />
    </main>
  )
}
