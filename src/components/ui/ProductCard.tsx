import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, WhatsappLogo, Star, Sparkle, Lightning, Heart, Clock } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { activeFlashSalePrice, buildProductWhatsAppMessage, buildWhatsAppUrl, formatPrice, isNewProduct } from '../../lib/utils'
import CountdownTimer from './CountdownTimer'
import type { Product } from '../../types'

interface Props {
  product: Product
  index?: number
  compact?: boolean
}

function ProductCard({ product, index = 0, compact = false }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const settings = useStoreSettings()
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
    toggleWishlist(product)
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault()
    const url = buildWhatsAppUrl(
      settings.whatsapp_number || '233000000000',
      buildProductWhatsAppMessage(product.title, product.selling_price, `${window.location.origin}/product/${product.id}`)
    )
    window.open(url, '_blank')
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
  }

  const image = product.images?.[0] || 'https://placehold.co/400x400/1a1008/d4820a?text=No+Image'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className="h-full min-w-0"
    >
      <Link to={`/product/${product.id}`} className={`card card-hover group flex flex-col h-full min-w-0 ${compact ? 'rounded-2xl' : ''}`}>
        {/* Image */}
        <div className={`relative overflow-hidden bg-cream-100 dark:bg-dark-700 ${compact ? 'aspect-[4/5] sm:aspect-square' : 'aspect-square'}`}>
          <img
            src={image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          {/* Badges */}
          <div className={`absolute top-2 left-2 flex flex-col gap-1 ${compact ? 'scale-90 origin-top-left sm:scale-100' : ''}`}>
            {onFlashSale && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <Lightning size={10} weight="fill" /> FLASH
              </span>
            )}
            {product.is_preorder && (
              <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock size={10} weight="fill" /> PREORDER
              </span>
            )}
            {isNew && !onFlashSale && (
              <span className="badge-new">
                <Sparkle size={10} weight="fill" /> NEW
              </span>
            )}
            {!onFlashSale && product.discount_percent && product.discount_percent > 0 && (
              <span className="badge-discount">-{product.discount_percent}%</span>
            )}
            {product.is_featured && (
              <span className="badge-featured">
                <Lightning size={10} weight="fill" className="text-brand-400" /> Featured
              </span>
            )}
          </div>
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
          <p className={`text-cream-400 dark:text-white/50 uppercase tracking-wider mb-0.5 sm:mb-1 font-medium truncate ${compact ? 'text-[8px] sm:text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>
            {product.category}
          </p>
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

            {/* Desktop: inline buttons */}
            {product.stock_status !== 'out_of_stock' && (
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <button
                  onClick={handleAddToCart}
                  className={`bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-xl flex items-center justify-center transition-colors text-dark-800 dark:text-white ${compact ? 'w-8 h-8' : 'w-9 h-9'}`}
                  aria-label="Add to cart"
                >
                  <ShoppingCart size={compact ? 13 : 14} weight="duotone" />
                </button>
                <button
                  onClick={handleWhatsApp}
                  className={`bg-whatsapp hover:bg-whatsapp-hover rounded-xl flex items-center justify-center transition-colors text-white ${compact ? 'w-8 h-8' : 'w-9 h-9'}`}
                  aria-label="Order via WhatsApp"
                >
                  <WhatsappLogo size={compact ? 13 : 14} weight="fill" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile: stacked full-width buttons */}
          {product.stock_status !== 'out_of_stock' && (
            <div className={`flex sm:hidden ${compact ? 'flex-col gap-1 mt-1' : 'flex-row gap-1.5'}`}>
              <button
                onClick={handleAddToCart}
                className={`flex-1 bg-cream-100 dark:bg-dark-700 active:bg-brand-400 active:text-white rounded-lg flex items-center justify-center transition-colors text-dark-800 dark:text-white ${compact ? 'h-6 sm:h-7' : 'h-8'}`}
                aria-label="Add to cart"
              >
                <ShoppingCart size={compact ? 12 : 14} weight="duotone" />
              </button>
              <button
                onClick={handleWhatsApp}
                className={`flex-1 bg-whatsapp active:bg-whatsapp-hover rounded-lg flex items-center justify-center transition-colors text-white ${compact ? 'h-6 sm:h-7' : 'h-8'}`}
                aria-label="Order via WhatsApp"
              >
                <WhatsappLogo size={compact ? 12 : 14} weight="fill" />
              </button>
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

