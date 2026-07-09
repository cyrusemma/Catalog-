import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ShoppingCart, ArrowRight } from '@phosphor-icons/react'
import { useCartStore } from '../../store/cartStore'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import { effectivePrice } from '../../lib/utils'
import type { Product } from '../../types'
import Image from './Image'

interface UnifiedHeroCarouselProps {
  products: Product[]
  heroImages?: string[]
}

export default function UnifiedHeroCarousel({ products, heroImages = [] }: UnifiedHeroCarouselProps) {
  const formatPrice = useCurrencyFormatter()
  const addItem = useCartStore(s => s.addItem)
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState(0) // -1 for prev, 1 for next

  // Autoplay functionality
  useEffect(() => {
    if (products.length <= 1) return
    const interval = setInterval(() => {
      setDirection(1)
      setIdx(prev => (prev + 1) % products.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [products.length])

  if (products.length === 0) return null

  const activeProduct = products[idx]
  const hasCustomHero = heroImages.length > 0
  const activeBackdrop = hasCustomHero 
    ? heroImages[idx % heroImages.length] 
    : activeProduct.images?.[0]

  const handleNext = () => {
    setDirection(1)
    setIdx(prev => (prev + 1) % products.length)
  }

  const handlePrev = () => {
    setDirection(-1)
    setIdx(prev => (prev - 1 + products.length) % products.length)
  }

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50
    if (info.offset.x < -swipeThreshold) {
      handleNext()
    } else if (info.offset.x > swipeThreshold) {
      handlePrev()
    }
  }

  // Animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 200 : -200,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
      },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -200 : 200,
      opacity: 0,
      transition: {
        x: { type: 'spring' as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
      },
    }),
  }

  const textContainerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const textItemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } 
    },
  }

  return (
    <div className="relative w-full overflow-hidden bg-cream-50 dark:bg-dark-950 min-h-[92dvh] flex items-center pt-20 -mt-16 transition-colors duration-300">
      {/* Background Layer: Animated backdrop halos */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeBackdrop || 'fallback'}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.25, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 w-full h-full"
          >
            {activeBackdrop ? (
              <img
                src={activeBackdrop}
                alt=""
                className="w-full h-full object-cover blur-3xl saturate-150 scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-500/10 to-brand-600/5" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Cinematic Scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-cream-50 via-cream-50/45 to-cream-50/20 dark:from-dark-950 dark:via-dark-950/40 dark:to-dark-950/20 transition-colors duration-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-cream-50/75 via-transparent to-transparent dark:from-dark-950/75 dark:via-transparent dark:to-transparent hidden lg:block transition-colors duration-300" />
      </div>

      {/* Main Grid Wrapper */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Glassmorphic Editorial Typography */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left max-w-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                custom={direction}
                variants={textContainerVariants}
                initial="hidden"
                animate="show"
                exit="hidden"
                className="glass p-6 sm:p-8 rounded-3xl border border-white/5 dark:border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              >
                {/* Decorative top border gradient line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-50" />
                
                <motion.div variants={textItemVariants} className="flex items-center gap-2 mb-4">
                  <span className="h-px w-6 bg-brand-400" />
                  <span className="text-brand-400 text-[10px] sm:text-xs uppercase tracking-[0.25em] font-semibold">
                    {activeProduct.category || 'Featured Collection'}
                  </span>
                </motion.div>

                <motion.h1 
                  variants={textItemVariants}
                  className="font-display font-semibold tracking-[-0.02em] text-dark-900 dark:text-white text-3xl sm:text-5xl lg:text-6xl leading-[1.05] mb-4 text-balance"
                >
                  {activeProduct.title}
                </motion.h1>

                <motion.div variants={textItemVariants} className="flex items-baseline gap-3 mb-5">
                  <span className="text-2xl sm:text-3xl font-display font-bold text-dark-900 dark:text-white">
                    {formatPrice(effectivePrice(activeProduct))}
                  </span>
                  {activeProduct.original_price && activeProduct.original_price > activeProduct.selling_price && (
                    <span className="text-sm sm:text-base text-dark-800/40 dark:text-white/40 line-through">
                      {formatPrice(activeProduct.original_price)}
                    </span>
                  )}
                </motion.div>

                <motion.p 
                  variants={textItemVariants}
                  className="text-dark-800/70 dark:text-white/70 text-sm sm:text-base mb-8 leading-relaxed line-clamp-3"
                >
                  {activeProduct.description || 'Discover a hand-picked favorite from our curated collection. Combining quality materials with a timeless design aesthetic, made to fit seamlessly into your lifestyle.'}
                </motion.p>

                <motion.div variants={textItemVariants} className="flex items-center gap-3.5 flex-wrap">
                  <Link 
                    to={`/product/${activeProduct.id}`}
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all duration-300 rounded-2xl font-semibold"
                  >
                    View Details <ArrowRight size={16} weight="bold" />
                  </Link>
                  {activeProduct.stock_status !== 'out_of_stock' && (
                    <button 
                      onClick={() => addItem(activeProduct)}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm border border-dark-800/10 dark:border-white/20 hover:border-brand-400 dark:hover:border-brand-400 text-dark-800 dark:text-white hover:text-brand-400 dark:hover:text-brand-400 bg-dark-800/5 dark:bg-white/5 hover:bg-brand-400/5 transition-all duration-300 rounded-2xl font-semibold backdrop-blur"
                    >
                      <ShoppingCart size={16} /> Quick Add
                    </button>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Column: Floating 3D/Interactive Product Card */}
          <div className="lg:col-span-5 flex justify-center items-center relative min-h-[350px] sm:min-h-[420px]">
            <div className="absolute inset-0 bg-gradient-radial from-brand-500/10 to-transparent blur-3xl rounded-full scale-75 select-none pointer-events-none" />
            
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-[4/5]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={idx}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleDragEnd}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
                >
                  <Link 
                    to={`/product/${activeProduct.id}`}
                    className="group relative block w-full h-full rounded-[2.25rem] overflow-hidden border border-cream-200 dark:border-white/10 shadow-2xl bg-white dark:bg-dark-900"
                  >
                    <Image
                      src={activeProduct.images?.[0] || 'https://placehold.co/600x750/1a1008/d4820a?text=No+Image'}
                      alt={activeProduct.title}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      priority
                    />

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-950/70 via-transparent to-transparent pointer-events-none" />

                    {/* Stock Status Badge */}
                    {activeProduct.stock_status === 'out_of_stock' && (
                      <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                        Out of Stock
                      </span>
                    )}

                    {/* Flash Sale Badge */}
                    {activeProduct.original_price && activeProduct.original_price > activeProduct.selling_price && (
                      <span className="absolute top-4 left-4 bg-brand-400 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                        Sale
                      </span>
                    )}
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>

      {/* Slide Navigation Controls */}
      {/* Desktop Navigation Chevrons */}
      <button
        onClick={handlePrev}
        aria-label="Previous Slide"
        className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 rounded-full border border-dark-800/10 dark:border-white/10 hover:border-brand-400 text-dark-800/50 dark:text-white/50 hover:text-brand-400 bg-dark-800/5 dark:bg-dark-950/30 hover:bg-brand-400/5 backdrop-blur transition-all duration-300 hover:scale-105 pointer-events-auto"
      >
        <CaretLeft size={24} weight="bold" />
      </button>
      <button
        onClick={handleNext}
        aria-label="Next Slide"
        className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-12 h-12 rounded-full border border-dark-800/10 dark:border-white/10 hover:border-brand-400 text-dark-800/50 dark:text-white/50 hover:text-brand-400 bg-dark-800/5 dark:bg-dark-950/30 hover:bg-brand-400/5 backdrop-blur transition-all duration-300 hover:scale-105 pointer-events-auto"
      >
        <CaretRight size={24} weight="bold" />
      </button>

      {/* Active Dot Indicators */}
      {products.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > idx ? 1 : -1)
                setIdx(i)
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 pointer-events-auto ${
                i === idx ? 'w-8 bg-brand-400' : 'w-2 bg-dark-800/20 dark:bg-white/30 hover:bg-dark-800/40 dark:hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
