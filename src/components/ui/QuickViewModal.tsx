import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, WhatsappLogo, CheckCircle, XCircle, Clock, Lightning } from '@phosphor-icons/react'
import { useQuickViewStore } from '../../store/quickViewStore'
import { useCartStore } from '../../store/cartStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { formatPrice, buildWhatsAppUrl, buildProductWhatsAppMessage, activeFlashSalePrice, effectivePrice } from '../../lib/utils'
import CountdownTimer from './CountdownTimer'
import { Link } from 'react-router-dom'

export default function QuickViewModal() {
  const { product, open, closeModal } = useQuickViewStore()
  const addItem = useCartStore(s => s.addItem)
  const settings = useStoreSettings()
  const [added, setAdded] = useState(false)

  if (!product) return null

  const handleAddToCart = () => {
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    // Don't auto-close modal so they can see the "Added!" feedback
  }

  const handleWhatsApp = () => {
    const url = buildWhatsAppUrl(
      settings.whatsapp_number || '233000000000',
      buildProductWhatsAppMessage(product.title, effectivePrice(product), `${window.location.origin}/product/${product.id}`)
    )
    window.open(url, '_blank')
  }

  const images = product.images?.length > 0 ? product.images : ['https://placehold.co/600x600/1a1008/d4820a?text=No+Image']
  
  const flashPrice = activeFlashSalePrice(product)
  const onFlashSale = flashPrice != null
  const displayPrice = flashPrice ?? product.selling_price
  const strikePrice = onFlashSale
    ? product.selling_price
    : (product.original_price && product.original_price > product.selling_price ? product.original_price : null)

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 bg-dark-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-4xl bg-white dark:bg-dark-900 rounded-3xl shadow-2xl overflow-hidden my-auto border border-cream-200 dark:border-white/10"
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-dark-800 dark:text-white transition-colors"
            >
              <X size={16} weight="bold" />
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Image Section */}
              <div className="w-full md:w-1/2 relative bg-cream-50 dark:bg-dark-800 flex-shrink-0">
                <div className="aspect-square md:aspect-auto md:h-full md:min-h-[400px]">
                  <img
                    src={images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="bg-brand-400 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                    {product.category}
                  </span>
                  {product.is_preorder && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <Clock size={12} weight="fill" /> Preorder
                    </span>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col">
                <h2 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-4 pr-6">
                  {product.title}
                </h2>

                {/* Price */}
                <div className={`rounded-2xl p-4 mb-6 ${onFlashSale ? 'bg-red-500/10 border border-red-500/30' : 'bg-cream-100/50 dark:bg-white/5'}`}>
                  {onFlashSale && product.flash_sale_ends_at && (
                    <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-red-500/20">
                      <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase tracking-wide">
                        <Lightning size={14} weight="fill" /> Flash Sale
                      </span>
                      <CountdownTimer endsAt={product.flash_sale_ends_at} variant="bar" />
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${onFlashSale ? 'text-red-500' : 'text-brand-400'}`}>
                      {formatPrice(displayPrice)}
                    </p>
                    {strikePrice && (
                      <p className="text-dark-800/40 dark:text-white/30 text-sm line-through">
                        {formatPrice(strikePrice)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stock */}
                <div className="flex items-center gap-2 mb-6">
                  {product.stock_status === 'in_stock' && (
                    <>
                      <CheckCircle size={16} weight="fill" className="text-green-500" />
                      <span className="text-green-500 text-sm font-semibold">In Stock</span>
                    </>
                  )}
                  {product.stock_status === 'few_units_left' && (
                    <>
                      <CheckCircle size={16} weight="fill" className="text-amber-500" />
                      <span className="text-amber-500 text-sm font-semibold">
                        Few units left
                      </span>
                    </>
                  )}
                  {product.stock_status === 'out_of_stock' && (
                    <>
                      <XCircle size={16} weight="fill" className="text-red-500" />
                      <span className="text-red-500 text-sm font-semibold">Out of Stock</span>
                    </>
                  )}
                </div>

                {product.description && (
                  <p className="text-dark-800/70 dark:text-white/60 text-sm line-clamp-3 mb-6">
                    {product.description}
                  </p>
                )}

                <div className="mt-auto pt-6 flex flex-col gap-3">
                  {product.stock_status !== 'out_of_stock' && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddToCart}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                          added
                            ? 'bg-green-500 text-white'
                            : 'bg-dark-800 dark:bg-dark-700 hover:bg-dark-700 dark:hover:bg-dark-600 text-white'
                        }`}
                      >
                        <ShoppingCart size={18} weight="duotone" />
                        {added ? 'Added!' : 'Add to Cart'}
                      </button>
                      <button onClick={handleWhatsApp} className="flex-1 btn-whatsapp justify-center py-3">
                        <WhatsappLogo size={18} weight="fill" />
                        WhatsApp
                      </button>
                    </div>
                  )}
                  
                  <Link
                    to={`/product/${product.id}`}
                    onClick={closeModal}
                    className="text-center text-sm font-semibold text-brand-400 hover:text-brand-500 transition-colors py-2"
                  >
                    View full details
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
