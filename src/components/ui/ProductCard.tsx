import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, Star, Lightning, Heart, Clock, Check, Tag, ArrowRight } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import { activeFlashSalePrice, isNewProduct, getProductPriceRange } from '../../lib/utils'
import CountdownTimer from './CountdownTimer'
import type { Product } from '../../types'
import Image from './Image'

interface Props {
  product: Product
  index?: number
  compact?: boolean
}

function ProductCard({ product, index = 0, compact = false }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const storeParam = searchParams.get('store')
  const detailUrl = storeParam ? `/product/${product.id}?store=${storeParam}` : `/product/${product.id}`

  const addItem = useCartStore(s => s.addItem)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const formatPrice = useCurrencyFormatter()
  const [added, setAdded] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const swipedRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const mediaImages = useMemo(() => {
    const images = [
      ...(product.images ?? []),
      ...(product.variants ?? []).map(variant => variant.image_url).filter((image): image is string => !!image),
    ]
    return [...new Set(images)]
  }, [product.images, product.variants])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [product.id])

  const handleMediaPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMediaPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    if (!start || mediaImages.length < 2) return

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) < 36 || Math.abs(dy) > Math.abs(dx)) return

    swipedRef.current = true
    setActiveImageIndex(current => (
      dx < 0
        ? (current + 1) % mediaImages.length
        : (current - 1 + mediaImages.length) % mediaImages.length
    ))
    window.setTimeout(() => {
      swipedRef.current = false
    }, 150)
  }

  const handleMediaPointerCancel = () => {
    pointerStartRef.current = null
  }

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (swipedRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const hasOptions = !!(
    (product.variants && product.variants.length > 0) ||
    (product.sizes && product.sizes.length > 0) ||
    (product.colors && product.colors.length > 0)
  )

  const priceRange = getProductPriceRange(product)
  const isNew = isNewProduct(product.created_at)
  const flashPrice = activeFlashSalePrice(product)
  const onFlashSale = flashPrice != null
  const displayPrice = flashPrice ?? product.selling_price
  const strikePrice = onFlashSale
    ? product.selling_price
    : (product.original_price && product.original_price > product.selling_price ? product.original_price : null)

  const isOutOfStock = product.stock_status === 'out_of_stock'
  const discountPct = !onFlashSale && product.discount_percent && product.discount_percent > 0
    ? product.discount_percent
    : null

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product)
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (hasOptions) {
      navigate(detailUrl)
      return
    }
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  // Determine the single most important badge to show (priority order)
  const primaryBadge = onFlashSale
    ? 'flash'
    : product.is_preorder
    ? 'preorder'
    : discountPct
    ? 'discount'
    : isNew
    ? 'new'
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index % 8, 4) * 0.03, ease: 'easeOut' }}
      whileHover={isOutOfStock ? undefined : { scale: 1.015 }}
      className="h-full min-w-0"
    >
      <Link to={detailUrl} onClick={handleCardClick} className={`card card-hover group flex flex-col h-full min-w-0 ${compact ? 'rounded-2xl' : ''}`}>
        {/* Image */}
        <div
          className={`relative overflow-hidden bg-cream-100 dark:bg-dark-700 touch-pan-y ${compact ? 'aspect-[4/5] sm:aspect-square' : 'aspect-square'}`}
          onPointerDown={handleMediaPointerDown}
          onPointerUp={handleMediaPointerUp}
          onPointerCancel={handleMediaPointerCancel}
          aria-label={mediaImages.length > 1 ? 'Swipe to view more product images' : undefined}
        >
          <Image
            key={mediaImages[activeImageIndex]}
            src={mediaImages[activeImageIndex] || 'https://placehold.co/400x400/1a1008/d4820a?text=No+Image'}
            alt={product.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isOutOfStock ? 'opacity-50 grayscale-[30%]' : ''}`}
          />

          {/* Glass Shine Sweep — only on in-stock items */}
          {!isOutOfStock && (
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-10" aria-hidden="true">
              <div className="absolute top-0 -left-[100%] w-[45%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-[20deg] group-hover:left-[130%] transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]" />
            </div>
          )}

          {mediaImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/25 px-2 py-1 backdrop-blur-md" aria-hidden="true">
              {mediaImages.map((image, imageIndex) => (
                <span
                  key={`${image}-${imageIndex}`}
                  className={`h-1 rounded-full transition-all ${imageIndex === activeImageIndex ? 'w-3 bg-white' : 'w-1 bg-white/55'}`}
                />
              ))}
            </div>
          )}

          {/* Primary badge — top-left, one at a time */}
          {primaryBadge === 'flash' && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm motion-safe:animate-pulse">
              <Lightning size={9} weight="fill" /> FLASH
            </span>
          )}
          {primaryBadge === 'preorder' && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 bg-slate-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              <Clock size={9} weight="fill" /> PRE-ORDER
            </span>
          )}
          {primaryBadge === 'discount' && (
            <span className="absolute top-2 left-2 bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
              -{discountPct}%
            </span>
          )}
          {primaryBadge === 'new' && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/90 dark:bg-dark-700/90 backdrop-blur-sm text-dark-800 dark:text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-dark-800/10 dark:border-white/15 shadow-sm">
              <Tag size={9} weight="fill" className="text-brand-400" /> NEW
            </span>
          )}

          {/* Wishlist */}
          <motion.button
            type="button"
            onClick={handleWishlist}
            whileTap={{ scale: 0.85 }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 bg-white/90 dark:bg-dark-800/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm ring-1 ring-black/5 hover:scale-110 transition-transform ${compact ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8'}`}
          >
            <Heart
              size={compact ? 14 : 15}
              weight={isWishlisted ? 'fill' : 'regular'}
              className={isWishlisted ? 'text-rose-500' : 'text-dark-800/50 dark:text-white/50'}
            />
          </motion.button>

          {/* Out of stock pill */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 z-20">
              <span className="inline-flex items-center gap-1.5 bg-dark-800/80 dark:bg-black/70 backdrop-blur-sm text-white text-[10px] font-semibold px-3 py-1.5 rounded-full tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className={`flex flex-col flex-grow ${compact ? 'p-2 sm:p-3' : 'p-2.5 sm:p-3.5'}`}>

          {/* Category label */}
          {product.category && (
            <p className={`text-dark-800/38 dark:text-white/38 uppercase tracking-wider font-medium truncate mb-1 ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
              {product.category}
            </p>
          )}

          {/* Title */}
          <h3 className={`text-dark-800 dark:text-white font-medium leading-snug line-clamp-2 mb-1.5 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors ${compact ? 'text-[12px] sm:text-[13px]' : 'text-[13px] sm:text-sm'}`}>
            {product.title}
          </h3>

          {/* Rating — desktop only */}
          {product.rating && (
            <div className="hidden sm:flex items-center gap-1 mb-1.5">
              <Star size={11} weight="fill" className="text-amber-400" />
              <span className="text-dark-800/50 dark:text-white/50 text-[11px]">
                {product.rating} <span className="text-dark-800/30 dark:text-white/30">({product.rating_count})</span>
              </span>
            </div>
          )}

          {/* Flash countdown */}
          {onFlashSale && product.flash_sale_ends_at && (
            <div className="flex items-center gap-1 mb-1.5 text-rose-600 dark:text-rose-400">
              <Clock size={10} weight="fill" />
              <CountdownTimer endsAt={product.flash_sale_ends_at} className="text-[10px] sm:text-xs font-medium" />
            </div>
          )}

          {/* Price row */}
          <div className={`mt-auto flex items-end justify-between gap-2 ${compact ? '' : ''}`}>
            <div className="min-w-0 flex-1">
              {priceRange.hasRange && !onFlashSale ? (
                <div>
                  <p className={`font-bold text-dark-800 dark:text-white truncate ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                    {priceRange.displayString}
                  </p>
                  <span className="text-[10px] text-dark-800/40 dark:text-white/38 font-medium">
                    {product.variants?.length} options
                  </span>
                </div>
              ) : (
                <div>
                  <p className={`font-bold truncate ${onFlashSale ? 'text-rose-600 dark:text-rose-400' : 'text-dark-800 dark:text-white'} text-xs sm:text-sm`}>
                    {formatPrice(displayPrice)}
                  </p>
                  {strikePrice && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <del className="discount-strike text-dark-800/35 dark:text-white/30 truncate text-[10px] sm:text-xs">
                        {formatPrice(strikePrice)}
                      </del>
                      <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1 py-0.5 rounded">
                        -{Math.round(((strikePrice - displayPrice) / strikePrice) * 100)}%
      	              </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop action button */}
            {!isOutOfStock && (
              <div className="hidden sm:flex items-center flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleActionClick}
                  aria-label={hasOptions ? 'Select options' : added ? 'Added to cart' : 'Add to cart'}
                  title={hasOptions ? 'Select options' : added ? 'Added to cart' : 'Add to cart'}
                  className={`rounded-xl flex items-center justify-center transition-all duration-300 text-white ${compact ? 'w-8 h-8' : 'w-9 h-9'} ${
                    added
                      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                      : hasOptions
                      ? 'bg-dark-800/80 hover:bg-dark-800 dark:bg-white/10 dark:hover:bg-white/20 text-white'
                      : 'bg-brand-400 hover:bg-brand-500 shadow-amber-glow'
                  }`}
                >
                  {added ? (
                    <Check size={compact ? 13 : 15} weight="bold" />
                  ) : hasOptions ? (
                    <ArrowRight size={compact ? 13 : 14} weight="bold" />
                  ) : (
                    <ShoppingCart size={compact ? 13 : 14} weight="duotone" />
                  )}
                </motion.button>
              </div>
            )}
          </div>

          {/* Mobile add-to-cart / select options */}
          {!isOutOfStock && (
            <div className="flex sm:hidden mt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleActionClick}
                aria-label={hasOptions ? 'Select options' : added ? 'Added to cart' : 'Add to cart'}
                className={`w-full rounded-lg flex items-center justify-center gap-1.5 transition-all duration-300 text-white font-semibold text-xs ${compact ? 'h-7' : 'h-8'} ${
                  added
                    ? 'bg-emerald-500'
                    : hasOptions
                    ? 'bg-dark-800/80 active:bg-dark-800 dark:bg-white/10 dark:active:bg-white/20 text-white'
                    : 'bg-brand-400 hover:bg-brand-500 active:bg-brand-600'
                }`}
              >
                {added ? (
                  <><Check size={12} weight="bold" /><span>Added!</span></>
                ) : hasOptions ? (
                  <><span>Select options</span><ArrowRight size={11} weight="bold" /></>
                ) : (
                  <><ShoppingCart size={12} weight="duotone" /><span>Add to cart</span></>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// Memoised to avoid cascading re-renders when cart/wishlist updates
export default memo(ProductCard)
