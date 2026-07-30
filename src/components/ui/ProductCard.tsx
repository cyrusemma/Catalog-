import { memo, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ShoppingCart, Star, Lightning, Heart, Clock, Check } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import { activeFlashSalePrice, isNewProduct } from '../../lib/utils'
import CountdownTimer from './CountdownTimer'
import { useSignInStore } from '../../store/signInStore'
import { useCustomerSession } from '../../hooks/useCustomerSession'
import type { Product } from '../../types'
import Image from './Image'

interface Props {
  product: Product
  index?: number
  compact?: boolean
}

function ProductCard({ product, index = 0, compact = false }: Props) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const storeParam = searchParams.get('store')
  const detailUrl = storeParam ? `/product/${product.id}?store=${storeParam}` : `/product/${product.id}`

  const addItem = useCartStore(s => s.addItem)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const formatPrice = useCurrencyFormatter()
  const { session } = useCustomerSession()
  const openSignInModal = useSignInStore(s => s.openModal)
  const [added, setAdded] = useState(false)
  
  const isNew = isNewProduct(product.created_at)
  const flashPrice = activeFlashSalePrice(product)
  const onFlashSale = flashPrice != null
  const displayPrice = flashPrice ?? product.selling_price
  // When on flash sale, the "was" price is the normal selling price; otherwise
  // fall back to the compare-at original price if there is one.
  const strikePrice = onFlashSale
    ? product.selling_price
    : (product.original_price && product.original_price > product.selling_price ? product.original_price : null)

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!session) {
      openSignInModal('Sign in to save favorites.')
      return
    }
    toggleWishlist(product)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
    if (!session) {
      openSignInModal('Create an account for a faster checkout experience!')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className="h-full min-w-0"
    >
      <Link to={detailUrl} className={`card card-hover group flex flex-col h-full min-w-0 ${compact ? 'rounded-2xl' : ''}`}>
        {/* Image */}
        <div className={`relative overflow-hidden bg-cream-100 dark:bg-dark-700 ${compact ? 'aspect-[4/5] sm:aspect-square' : 'aspect-square'}`}>
          <Image
            src={product.images?.[0] || 'https://placehold.co/400x400/1a1008/d4820a?text=No+Image'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Glass Shine Sweep Micro-Animation */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-10" aria-hidden="true">
            <div className="absolute top-0 -left-[100%] w-[45%] h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-[20deg] group-hover:left-[130%] transition-all duration-[800ms] ease-[cubic-bezier(0.25,1,0.5,1)]" />
          </div>

          {/* Discount Tag */}
          {!onFlashSale && product.discount_percent && product.discount_percent > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
              -{product.discount_percent}%
            </span>
          )}

          {/* Wishlist heart */}
          <motion.button
            type="button"
            onClick={handleWishlist}
            whileTap={{ scale: 0.85 }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute top-2 right-2 bg-white/90 dark:bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-md ring-1 ring-black/5 hover:scale-110 transition-transform ${compact ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8'}`}
          >
            <Heart
              size={compact ? 14 : 16}
              weight={isWishlisted ? 'fill' : 'regular'}
              className={isWishlisted ? 'text-red-500' : 'text-dark-800/70'}
            />
          </motion.button>
          {product.stock_status === 'out_of_stock' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className={`flex flex-col flex-grow ${compact ? 'p-2 sm:p-3' : 'p-2.5 sm:p-3.5'}`}>
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-2">
            <p className={`text-cream-400 dark:text-white/50 uppercase tracking-wider font-medium truncate ${compact ? 'text-[8px] sm:text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>
              {product.category}
            </p>
            <div className={`flex flex-wrap gap-1 ${compact ? 'scale-90 origin-right' : ''}`}>
              {onFlashSale && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm animate-pulse">
                  <Lightning size={10} weight="fill" /> FLASH
                </span>
              )}
              {product.is_preorder && (
                <span className="bg-blue-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-sm">
                  <Clock size={10} weight="fill" /> PREORDER
                </span>
              )}
              {isNew && !onFlashSale && (
                <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 border border-brand-200 dark:border-brand-800/30">
                  <span className="w-1 h-1 rounded-full bg-brand-500 dark:bg-brand-400 animate-pulse" />
                  <span>NEW</span>
                </span>
              )}
              {product.is_featured && (
                <span className="animate-star-live flex items-center justify-center px-1 py-0.5" title="Featured">
                  <Star size={12} weight="fill" />
                </span>
              )}
            </div>
          </div>
          <h3 className={`text-dark-800 dark:text-white font-medium leading-snug line-clamp-2 mb-1.5 sm:mb-2 group-hover:text-brand-400 transition-colors ${compact ? 'text-[12px] sm:text-sm' : 'text-[13px] sm:text-sm'}`}>
            {product.title}
          </h3>

          {product.rating && (
            <div className="hidden sm:flex items-center gap-1 mb-2">
              <Star size={11} weight="fill" className="text-brand-400 fill-brand-400" />
              <span className="text-dark-800/60 dark:text-white/60 text-xs">
                {product.rating} ({product.rating_count})
              </span>
            </div>
          )}

          {onFlashSale && product.flash_sale_ends_at && (
            <div className="flex items-center gap-1 mb-1.5 text-red-500">
              <Clock size={11} weight="fill" />
              <CountdownTimer endsAt={product.flash_sale_ends_at} className="text-[10px] sm:text-xs" />
            </div>
          )}

          {/* Price */}
          <div className={`mt-auto mb-2 sm:mb-0 sm:flex sm:items-center sm:justify-between ${compact ? 'gap-2' : ''}`}>
            <div className="min-w-0">
              <p className={`font-bold truncate ${onFlashSale ? 'text-red-500' : 'text-brand-400'} ${compact ? 'text-sm sm:text-base' : 'text-sm sm:text-base'}`}>{formatPrice(displayPrice)}</p>
              {strikePrice && (
                <p className={`text-cream-400 dark:text-white/30 line-through truncate ${compact ? 'text-[9px] sm:text-xs' : 'text-[10px] sm:text-xs'}`}>
                  {formatPrice(strikePrice)}
                </p>
              )}
            </div>

            {/* Desktop: inline add to cart button with success feedback */}
            {product.stock_status !== 'out_of_stock' && (
              <div className="hidden sm:flex items-center ml-2">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleAddToCart}
                  aria-label={added ? 'Added to cart' : 'Add to cart'}
                  className={`rounded-xl flex items-center justify-center transition-all duration-300 text-white ${compact ? 'w-8 h-8' : 'w-9 h-9'} ${
                    added
                      ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                      : 'bg-brand-400 hover:bg-brand-500'
                  }`}
                >
                  {added
                    ? <Check size={compact ? 13 : 15} weight="bold" />
                    : <ShoppingCart size={compact ? 13 : 14} weight="duotone" />}
                </motion.button>
              </div>
            )}
          </div>

          {/* Mobile: full-width add to cart with success feedback */}
          {product.stock_status !== 'out_of_stock' && (
            <div className={`flex sm:hidden mt-2`}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAddToCart}
                aria-label={added ? 'Added to cart' : 'Add to cart'}
                className={`w-full rounded-lg flex items-center justify-center gap-2 transition-all duration-300 text-white font-semibold text-xs ${compact ? 'h-7' : 'h-8'} ${
                  added
                    ? 'bg-green-500'
                    : 'bg-brand-400 hover:bg-brand-500 active:bg-brand-600'
                }`}
              >
                {added
                  ? <><Check size={compact ? 12 : 13} weight="bold" /><span>Added!</span></>
                  : <><ShoppingCart size={compact ? 12 : 14} weight="duotone" /><span>Add</span></>}
              </motion.button>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

// Cart count, wishlist toggles and store settings all bubble re-renders up here
// through the storefront. Memoizing prevents every product card on screen from
// repainting when, say, a single item is added to the cart. The default shallow
// prop check is enough — `product` is stable per id and `compact`/`index` are primitives.
export default memo(ProductCard)

