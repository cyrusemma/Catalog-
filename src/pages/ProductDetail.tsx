import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, WhatsappLogo, Star, CheckCircle, XCircle, SmileySad, ShareNetwork, Truck, Lightning, Clock } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useProduct } from '../hooks/useProducts'
import { useCartStore } from '../store/cartStore'
import { useRecentStore } from '../store/recentStore'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { buildWhatsAppUrl, buildProductWhatsAppMessage, activeFlashSalePrice, effectivePrice } from '../lib/utils'
import { supabase } from '../lib/supabase'
import CountdownTimer from '../components/ui/CountdownTimer'
import ProductCard from '../components/ui/ProductCard'

export default function ProductDetail() {
  const formatPrice = useCurrencyFormatter()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const isMarketplaceView = !searchParams.get('store')
  const { data: product, isLoading } = useProduct(id!, isMarketplaceView)
  const storeSlug = searchParams.get('store')

  const { data: merchantStore } = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: async () => {
      if (!storeSlug) return null
      const { data } = await supabase
        .from('stores')
        .select('whatsapp_number')
        .eq('slug', storeSlug)
        .maybeSingle()
      return data
    },
    enabled: !!storeSlug,
  })

  // Fetch related products in the same category
  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id, product?.id, isMarketplaceView, product?.store_id],
    queryFn: async () => {
      if (!product) return []
      let query = supabase
        .from('products')
        .select('*')
        .neq('id', product.id)
        .eq('is_published', true)

      if (isMarketplaceView) {
        // Main marketplace: same category, owned by platform OR approved merchant items
        query = query
          .eq('category_id', product.category_id)
          .or('store_id.is.null,is_approved_for_marketplace.eq.true')
      } else {
        // Merchant shop: same category, restricted to this merchant's store_id
        query = query
          .eq('store_id', product.store_id)
          .eq('category_id', product.category_id)
      }

      const { data } = await query.limit(4)
      return data || []
    },
    enabled: !!product?.category_id,
  })
  const addItem = useCartStore(s => s.addItem)
  const addRecent = useRecentStore(s => s.addRecent)
  const recentItems = useRecentStore(s => s.recent)
  const settings = useStoreSettings()
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (product) {
      addRecent(product)
      setActiveImg(0)
    }
  }, [product, addRecent])

  const handleAddToCart = () => {
    if (!product) return
    addItem(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleWhatsApp = () => {
    if (!product) return
    const targetWhatsApp = (!isMarketplaceView && merchantStore?.whatsapp_number)
      ? merchantStore.whatsapp_number
      : (settings.whatsapp_number || '233000000000')

    const url = buildWhatsAppUrl(
      targetWhatsApp,
      buildProductWhatsAppMessage(product.title, effectivePrice(product), window.location.href)
    )
    window.open(url, '_blank')
  }

  const handleShare = async () => {
    if (!product) return
    const text = `Check this out: ${product.title} — GH₵ ${effectivePrice(product)}`
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: product.title, text, url }) } catch { /* user cancelled */ }
      return
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank')
  }

  if (isLoading) {
    return (
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-6 w-28 bg-cream-100 dark:bg-dark-700 rounded mb-8" />
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-cream-100 dark:bg-dark-700 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-cream-100 dark:bg-dark-700 rounded w-3/4" />
            <div className="h-6 bg-cream-100 dark:bg-dark-700 rounded w-1/4" />
            <div className="h-24 bg-cream-100 dark:bg-dark-700 rounded" />
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <SmileySad size={56} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-dark-800 dark:text-white mb-2">Product not found</h2>
          <Link to="/shop" className="btn-primary inline-flex mt-4">Back to Shop</Link>
        </div>
      </main>
    )
  }

  const images = product.images?.length > 0 ? product.images : ['https://placehold.co/600x600/1a1008/d4820a?text=No+Image']

  const flashPrice = activeFlashSalePrice(product)
  const onFlashSale = flashPrice != null
  const displayPrice = flashPrice ?? product.selling_price
  const strikePrice = onFlashSale
    ? product.selling_price
    : (product.original_price && product.original_price > product.selling_price ? product.original_price : null)

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-10 pb-28 lg:pb-10">
      <Link to="/shop" className="inline-flex items-center gap-2 text-dark-800/60 dark:text-white/50 hover:text-brand-400 text-sm mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-3xl overflow-hidden bg-cream-100 dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 mb-3 relative">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                src={images[activeImg]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImg === i ? 'border-brand-400 shadow-amber-glow' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">{product.category}</span>
            {product.is_preorder && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Clock size={11} weight="fill" /> PREORDER
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white mb-4 leading-snug">{product.title}</h1>

          {product.rating && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    weight={i < Math.round(product.rating!) ? 'fill' : 'regular'}
                    className={i < Math.round(product.rating!) ? 'text-brand-400 fill-brand-400 drop-shadow-[0_0_6px_rgba(212,130,10,0.6)]' : 'text-cream-300 dark:text-white/20'}
                  />
                ))}
              </div>
              <span className="text-dark-800/60 dark:text-white/50 text-sm">{product.rating} ({product.rating_count} reviews)</span>
            </div>
          )}

          {/* Price card */}
          <div className={`rounded-2xl p-5 mb-6 ${onFlashSale ? 'bg-red-500/10 border border-red-500/30' : 'glass-amber shadow-amber-glow'}`}>
            {onFlashSale && product.flash_sale_ends_at && (
              <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-red-500/20">
                <span className="inline-flex items-center gap-1.5 text-red-500 font-bold text-sm uppercase tracking-wide">
                  <Lightning size={16} weight="fill" /> Flash Sale
                </span>
                <CountdownTimer endsAt={product.flash_sale_ends_at} variant="bar" />
              </div>
            )}
            <p className={`text-4xl sm:text-5xl font-bold mb-1 ${onFlashSale ? 'text-red-500' : 'text-brand-400'}`}>{formatPrice(displayPrice)}</p>
            {strikePrice && (
              <div className="flex items-center gap-2">
                <p className="text-dark-800/40 dark:text-white/30 text-sm line-through">{formatPrice(strikePrice)}</p>
                <span className="badge-discount">-{Math.round(((strikePrice - displayPrice) / strikePrice) * 100)}%</span>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 mb-6">
            {product.stock_status === 'in_stock' && (
              <>
                <CheckCircle size={18} weight="fill" className="text-green-500" />
                <span className="text-green-500 text-sm font-semibold">In Stock</span>
              </>
            )}
            {product.stock_status === 'few_units_left' && (
              <>
                <CheckCircle size={18} weight="fill" className="text-amber-500" />
                <span className="text-amber-500 text-sm font-semibold">
                  Few units left{product.stock > 0 ? ` — only ${product.stock} remaining` : ''}
                </span>
              </>
            )}
            {product.stock_status === 'out_of_stock' && (
              <>
                <XCircle size={18} weight="fill" className="text-red-500" />
                <span className="text-red-500 text-sm font-semibold">Out of Stock</span>
              </>
            )}
          </div>

          {/* Delivery info */}
          <div className="flex items-center gap-2 mb-6">
            <Truck size={18} weight="duotone" className={Number(product.delivery_fee) > 0 ? 'text-brand-400' : 'text-green-500'} />
            {Number(product.delivery_fee) > 0 ? (
              <span className="text-dark-800/80 dark:text-white/70 text-sm">
                Delivery: <span className="font-semibold text-dark-800 dark:text-white">{formatPrice(Number(product.delivery_fee))}</span>
              </span>
            ) : (
              <span className="text-green-500 text-sm font-semibold">Free delivery</span>
            )}
          </div>

          {/* Available sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-6">
              <p className="text-dark-800/60 dark:text-white/50 text-xs uppercase tracking-[0.2em] font-semibold mb-2">
                Available Sizes
              </p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1.5 rounded-lg border border-brand-400/30 bg-brand-400/5 text-dark-800 dark:text-white text-sm font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className="text-dark-800/45 dark:text-white/35 text-[11px] mt-2">
                Mention your size when you order via WhatsApp.
              </p>
            </div>
          )}

          {product.description && (
            <p className="text-dark-800/70 dark:text-white/60 text-sm leading-relaxed mb-6">{product.description}</p>
          )}

          {product.key_features && product.key_features.length > 0 && (
            <div className="mb-6">
              <h3 className="text-dark-800 dark:text-white font-semibold mb-3">Key Features</h3>
              <ul className="space-y-2">
                {product.key_features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-dark-800/70 dark:text-white/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {product.stock_status !== 'out_of_stock' && (
            <div className="flex gap-3 mt-auto">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all ${
                  added
                    ? 'bg-green-500 text-white'
                    : 'bg-dark-800 dark:bg-dark-700 hover:bg-dark-700 dark:hover:bg-dark-600 text-white border border-dark-700 dark:border-white/10'
                }`}
              >
                <ShoppingCart size={18} weight="duotone" />
                {added ? 'Added to Cart!' : 'Add to Cart'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-medium text-brand-400 hover:bg-brand-400/10 border border-brand-400/30 transition-colors"
          >
            <ShareNetwork size={16} weight="duotone" />
            Share this product
          </button>
        </div>
      </div>

      {relatedProducts && relatedProducts.length > 0 && (
        <div className="mt-16 sm:mt-24 pt-10 border-t border-cream-200 dark:border-dark-700/50">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-800 dark:text-white mb-6">
            More in this Category
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {relatedProducts.map((p, index) => (
              <ProductCard key={p.id} product={p} index={index} />
            ))}
          </div>
        </div>
      )}

      {recentItems.filter(p => p.id !== product.id).length > 0 && (
        <div className="mt-16 sm:mt-24 pt-10 border-t border-cream-200 dark:border-dark-700/50">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-800 dark:text-white mb-6">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {recentItems
              .filter(p => p.id !== product.id)
              .slice(0, 4)
              .map((p, index) => (
                <ProductCard key={p.id} product={p} index={index} />
              ))}
          </div>
        </div>
      )}
    </main>
  )
}
