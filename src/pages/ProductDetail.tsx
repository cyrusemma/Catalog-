import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Star, CheckCircle, XCircle, SmileySad, ShareNetwork, Truck, Lightning, Clock, Heart } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useProduct } from '../hooks/useProducts'
import { useCartStore } from '../store/cartStore'
import { useRecentStore } from '../store/recentStore'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { effectivePrice, activeFlashSalePrice } from '../lib/utils'
import { supabase } from '../lib/supabase'
import CountdownTimer from '../components/ui/CountdownTimer'
import ProductCard from '../components/ui/ProductCard'
import Image from '../components/ui/Image'
import { useSignInStore } from '../store/signInStore'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { trackProductView, trackCartInteraction } from '../components/ui/AppReviewPrompt'
import { useStoreContext } from '../contexts/StoreContext'

export default function ProductDetail() {
  const formatPrice = useCurrencyFormatter()
  const { id, storeSlug } = useParams<{ id: string; storeSlug?: string }>()
  const isMarketplaceView = !storeSlug
  const { storeId } = useStoreContext()
  const { data: product, isLoading } = useProduct(id!, isMarketplaceView)
  useDocumentTitle(product?.title || 'Product')

  useEffect(() => {
    if (product) {
      trackProductView()
    }
  }, [product?.id])


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
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      addRecent(product)
      setActiveImg(0)
      // Reset selections when product changes
      setSelectedSize(null)
      setSelectedColor(null)
    }
  }, [product, addRecent])

  const { session } = useCustomerSession()
  const openSignInModal = useSignInStore(s => s.openModal)

  const handleAddToCart = () => {
    if (!product) return
    addItem(product)
    setAdded(true)
    trackCartInteraction()
    setTimeout(() => setAdded(false), 2000)
    
    if (!session) {
      openSignInModal('Create an account for a faster checkout experience!')
    }
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

  const backPath = storeSlug ? `/s/${storeSlug}` : '/shop'
  const backLabel = storeSlug ? 'Back to Storefront' : 'Back to Shop'
  const isUnauthorized = !isMarketplaceView && storeId && product && product.store_id !== storeId

  if (!product || isUnauthorized) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <SmileySad size={56} weight="duotone" className="text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-dark-800 dark:text-white mb-2">Product not found</h2>
          <Link to={backPath} className="btn-primary inline-flex mt-4">{backLabel}</Link>
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
      <Link to={backPath} className="inline-flex items-center gap-2 text-dark-800/60 dark:text-white/50 hover:text-brand-400 text-sm mb-8 transition-colors">
        <ArrowLeft size={16} /> {backLabel}
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
                  <Image src={img} alt="" className="w-full h-full object-cover" />
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
              <a 
                href="#reviews"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      weight={i < Math.round(product.rating!) ? 'fill' : 'regular'}
                      className={i < Math.round(product.rating!) ? 'text-brand-400 fill-brand-400 drop-shadow-[0_0_6px_rgba(212,130,10,0.6)] group-hover:drop-shadow-[0_0_8px_rgba(212,130,10,0.8)] transition-all' : 'text-cream-300 dark:text-white/20'}
                    />
                  ))}
                </div>
                <span className="text-brand-400 text-sm font-medium hover:underline decoration-brand-400/30 underline-offset-4">{product.rating} ({product.rating_count} reviews)</span>
              </a>
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
              <div className="flex items-center justify-between mb-2">
                <p className="text-dark-800/60 dark:text-white/50 text-xs uppercase tracking-[0.2em] font-semibold">
                  Size
                </p>
                {selectedSize && (
                  <span className="text-xs font-semibold text-brand-400">{selectedSize}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => {
                  const active = selectedSize === s
                  return (
                    <motion.button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(active ? null : s)}
                      whileTap={{ scale: 0.92 }}
                      animate={active ? { scale: 1.06 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      aria-label={`Select size ${s}`}
                      aria-pressed={active}
                      className={`relative inline-flex items-center justify-center min-w-[2.75rem] px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors duration-150 ${
                        active
                          ? 'border-brand-400 bg-brand-400 text-white shadow-amber-glow'
                          : 'border-brand-400/30 bg-brand-400/5 text-dark-800 dark:text-white hover:border-brand-400/60 hover:bg-brand-400/10'
                      }`}
                    >
                      {s}
                    </motion.button>
                  )
                })}
              </div>
              {!selectedSize && (
                <p className="text-dark-800/45 dark:text-white/35 text-[11px] mt-2">
                  {(!product.colors || product.colors.length === 0)
                    ? 'Tap to select your size.'
                    : 'Tap to select your size.'}
                </p>
              )}
            </div>
          )}

          {/* Available colors */}
          {product.colors && product.colors.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-dark-800/60 dark:text-white/50 text-xs uppercase tracking-[0.2em] font-semibold">
                  Color
                </p>
                {selectedColor && (
                  <span className="text-xs font-semibold text-brand-400">{selectedColor}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map(c => {
                  const active = selectedColor === c
                  return (
                    <motion.button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(active ? null : c)}
                      whileTap={{ scale: 0.92 }}
                      animate={active ? { scale: 1.06 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      aria-label={`Select color ${c}`}
                      aria-pressed={active}
                      className={`relative inline-flex items-center justify-center min-w-[2.75rem] px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors duration-150 ${
                        active
                          ? 'border-brand-400 bg-brand-400 text-white shadow-amber-glow'
                          : 'border-brand-400/30 bg-brand-400/5 text-dark-800 dark:text-white hover:border-brand-400/60 hover:bg-brand-400/10'
                      }`}
                    >
                      {c}
                    </motion.button>
                  )
                })}
              </div>
              {!selectedColor && (
                <p className="text-dark-800/45 dark:text-white/35 text-[11px] mt-2">
                  Tap to select your color.
                </p>
              )}
            </div>
          )}

          {product.description && (
            <div 
              className="text-dark-800/70 dark:text-white/60 text-sm leading-relaxed mb-6 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&_a]:text-brand-400 hover:[&_a]:text-brand-500 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
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
              <motion.button
                type="button"
                onClick={() => {
                  handleAddToCart()
                  // Reset selections after adding to cart
                  setTimeout(() => {
                    setSelectedSize(null)
                    setSelectedColor(null)
                  }, 2000)
                }}
                whileTap={{ scale: 0.97 }}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all ${
                  added
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-dark-800 dark:bg-dark-700 hover:bg-dark-700 dark:hover:bg-dark-600 text-white border border-dark-700 dark:border-white/10'
                }`}
              >
                <ShoppingCart size={18} weight="duotone" />
                {added
                  ? 'Added to Cart!'
                  : (() => {
                      const parts = ['Add to Cart']
                      const details = [selectedSize, selectedColor].filter(Boolean)
                      if (details.length > 0) return `Add — ${details.join(' · ')}`
                      return parts[0]
                    })()}
              </motion.button>
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
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 sm:gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {relatedProducts.map((p, index) => (
              <div key={p.id} className="w-[160px] sm:w-[200px] flex-shrink-0 snap-start">
                <ProductCard product={p} index={index} compact={true} />
              </div>
            ))}
          </div>
        </div>
      )}

      {recentItems.filter(p => p.id !== product.id).length > 0 && (
        <div className="mt-16 sm:mt-24 pt-10 border-t border-cream-200 dark:border-dark-700/50">
          <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-800 dark:text-white mb-6">
            Recently Viewed
          </h2>
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 sm:gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {recentItems
              .filter(p => p.id !== product.id)
              .slice(0, 8)
              .map((p, index) => (
                <div key={p.id} className="w-[160px] sm:w-[200px] flex-shrink-0 snap-start">
                  <ProductCard product={p} index={index} compact={true} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Product Reviews ── */}
      <ProductReviewsSection productId={product.id} storeId={product.store_id ?? null} />
    </main>
  )
}

// ─── Reviews Section Component ───────────────────────────────────────────────

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          weight={i < Math.round(rating) ? 'fill' : 'regular'}
          className={
            i < Math.round(rating)
              ? 'text-brand-400 fill-brand-400 drop-shadow-[0_0_4px_rgba(212,130,10,0.5)]'
              : 'text-cream-300 dark:text-white/20'
          }
        />
      ))}
    </div>
  )
}

function ProductReviewsSection({
  productId,
  storeId,
}: {
  productId: string
  storeId: string | null
}) {
  const { session } = useCustomerSession()
  const openSignInModal = useSignInStore(s => s.openModal)
  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: reviews, refetch } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const avgRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      openSignInModal('Sign in to leave a review.')
      return
    }
    setIsSubmitting(true)
    try {
      await supabase.from('product_reviews').insert({
        product_id: productId,
        store_id: storeId,
        customer_id: session.user.id,
        reviewer_name: reviewerName.trim() || null,
        rating,
        comment: comment.trim() || null,
        status: 'pending',
      })
      setSubmitted(true)
      setFormOpen(false)
      refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="reviews" className="mt-16 sm:mt-24 pt-10 border-t border-cream-200 dark:border-dark-700/50">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-dark-800 dark:text-white">
            Customer Reviews
          </h2>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay rating={avgRating} size={16} />
              <span className="text-sm text-dark-800/60 dark:text-white/50">
                {avgRating.toFixed(1)} · {reviews?.length} review{reviews?.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        {!submitted && (
          <button
            type="button"
            onClick={() => {
              if (!session) { openSignInModal('Sign in to leave a review.'); return }
              setFormOpen(v => !v)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-brand-400/30 text-brand-400 text-sm font-semibold hover:bg-brand-400/10 transition-colors"
          >
            <Star size={14} weight="duotone" />
            {formOpen ? 'Cancel' : 'Write a review'}
          </button>
        )}
      </div>

      {/* Submission confirmation */}
      {submitted && (
        <div className="flex items-center justify-center gap-3 bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800/30 rounded-2xl px-6 py-6 mb-6 text-brand-600 dark:text-brand-400 font-medium text-center">
          <Heart size={24} weight="fill" className="animate-pulse" />
          Thank you for your review!
        </div>
      )}

      {/* Review form */}
      <AnimatePresence>
        {formOpen && (
          <motion.form
            key="review-form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit}
            className="card p-5 mb-8 space-y-4"
          >
            <div>
              <p className="text-sm font-semibold text-dark-800 dark:text-white mb-2">Your rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      size={28}
                      weight={(hoverRating || rating) >= star ? 'fill' : 'regular'}
                      className={(hoverRating || rating) >= star ? 'text-brand-400' : 'text-cream-300 dark:text-white/20'}
                    />
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={reviewerName}
              onChange={e => setReviewerName(e.target.value)}
              className="input w-full text-sm"
            />
            <textarea
              placeholder="Share your thoughts about this product..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              className="input w-full text-sm resize-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Published reviews list */}
      {!reviews || reviews.length === 0 ? (
        <div className="text-center py-10 text-dark-800/40 dark:text-white/30 text-sm">
          No reviews yet. Be the first to review this product!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-semibold text-dark-800 dark:text-white text-sm">
                    {review.reviewer_name || 'Anonymous'}
                  </p>
                  <p className="text-[11px] text-dark-800/40 dark:text-white/30 mt-0.5">
                    {new Date(review.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <StarDisplay rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-dark-800/70 dark:text-white/60 leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
