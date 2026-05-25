import { Link } from 'react-router-dom'
import { ShoppingCart, WhatsappLogo, Star, Sparkle, Lightning, Heart } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { buildProductWhatsAppMessage, buildWhatsAppUrl, formatPrice, isNewProduct } from '../../lib/utils'
import type { Product } from '../../types'

interface Props {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has(product.id))
  const settings = useStoreSettings()
  const isNew = isNewProduct(product.created_at)

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
    >
      <Link to={`/product/${product.id}`} className="card card-hover group block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-cream-100 dark:bg-dark-700">
          <img
            src={image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && (
              <span className="badge-new">
                <Sparkle size={10} weight="fill" /> NEW
              </span>
            )}
            {product.discount_percent && product.discount_percent > 0 && (
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
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center shadow-md ring-1 ring-black/5 hover:scale-110 transition-transform"
          >
            <Heart
              size={16}
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
        <div className="p-2.5 sm:p-3.5">
          <p className="text-cream-400 dark:text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider mb-0.5 sm:mb-1 font-medium truncate">
            {product.category}
          </p>
          <h3 className="text-dark-800 dark:text-white text-[13px] sm:text-sm font-medium leading-snug line-clamp-2 mb-1.5 sm:mb-2 group-hover:text-brand-400 transition-colors">
            {product.title}
          </h3>

          {product.rating && (
            <div className="hidden sm:flex items-center gap-1 mb-2">
              <Star size={11} weight="fill" className="text-brand-400" />
              <span className="text-dark-800/60 dark:text-white/60 text-xs">
                {product.rating} ({product.rating_count})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="mb-2 sm:mb-0 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-brand-400 font-bold text-sm sm:text-base truncate">{formatPrice(product.selling_price)}</p>
              {product.original_price && product.original_price > product.selling_price && (
                <p className="text-cream-400 dark:text-white/30 text-[10px] sm:text-xs line-through truncate">
                  {formatPrice(product.original_price)}
                </p>
              )}
            </div>

            {/* Desktop: inline buttons */}
            {product.stock_status !== 'out_of_stock' && (
              <div className="hidden sm:flex items-center gap-1.5 ml-2">
                <button
                  onClick={handleAddToCart}
                  className="w-9 h-9 bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-xl flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                  aria-label="Add to cart"
                >
                  <ShoppingCart size={14} weight="duotone" />
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="w-9 h-9 bg-whatsapp hover:bg-whatsapp-hover rounded-xl flex items-center justify-center transition-colors text-white"
                  aria-label="Order via WhatsApp"
                >
                  <WhatsappLogo size={14} weight="fill" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile: stacked full-width buttons */}
          {product.stock_status !== 'out_of_stock' && (
            <div className="flex gap-1.5 sm:hidden">
              <button
                onClick={handleAddToCart}
                className="flex-1 h-8 bg-cream-100 dark:bg-dark-700 active:bg-brand-400 active:text-white rounded-lg flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                aria-label="Add to cart"
              >
                <ShoppingCart size={14} weight="duotone" />
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 h-8 bg-whatsapp active:bg-whatsapp-hover rounded-lg flex items-center justify-center transition-colors text-white"
                aria-label="Order via WhatsApp"
              >
                <WhatsappLogo size={14} weight="fill" />
              </button>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
