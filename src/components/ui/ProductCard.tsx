import { Link } from 'react-router-dom'
import { ShoppingCart, WhatsappLogo, Star, Sparkle, Lightning } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useCartStore } from '../../store/cartStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { buildProductWhatsAppMessage, buildWhatsAppUrl, formatPrice, isNewProduct } from '../../lib/utils'
import type { Product } from '../../types'

interface Props {
  product: Product
  index?: number
}

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const settings = useStoreSettings()
  const isNew = isNewProduct(product.created_at)

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
          {product.stock_status === 'out_of_stock' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <span className="text-white font-semibold text-sm tracking-wide">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5">
          <p className="text-cream-400 dark:text-white/50 text-[10px] uppercase tracking-wider mb-1 font-medium">
            {product.category}
          </p>
          <h3 className="text-dark-800 dark:text-white text-sm font-medium leading-snug line-clamp-2 mb-2 group-hover:text-brand-400 transition-colors">
            {product.title}
          </h3>

          {product.rating && (
            <div className="flex items-center gap-1 mb-2">
              <Star size={11} weight="fill" className="text-brand-400" />
              <span className="text-dark-800/60 dark:text-white/60 text-xs">
                {product.rating} ({product.rating_count})
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-400 font-bold text-base">{formatPrice(product.selling_price)}</p>
              {product.original_price && product.original_price > product.selling_price && (
                <p className="text-cream-400 dark:text-white/30 text-xs line-through">
                  {formatPrice(product.original_price)}
                </p>
              )}
            </div>

            {product.stock_status !== 'out_of_stock' && (
              <div className="flex items-center gap-1.5">
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
        </div>
      </Link>
    </motion.div>
  )
}
