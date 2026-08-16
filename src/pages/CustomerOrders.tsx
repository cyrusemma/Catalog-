import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, CheckCircle, Truck, Clock, ShoppingBag, Star, X, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
}

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

function OrderStatusProgress({ currentStepIndex }: { currentStepIndex: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`
    }
  }, [currentStepIndex])
  return (
    <div
      ref={ref}
      className="absolute top-1/2 left-6 h-1 bg-brand-400 -translate-y-1/2 rounded-full transition-all duration-1000 hidden sm:block"
    />
  )
}

export default function CustomerOrders() {
  const { user, isLoggedIn, loading } = useCustomerSession()
  const navigate = useNavigate()
  const formatPrice = useCurrencyFormatter()
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<{ item: any, orderId: string } | null>(null)
  
  // Track reviewed items using localStorage
  const [reviewedItems, setReviewedItems] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('customer_reviewed_items')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [loading, isLoggedIn, navigate])

  const markAsReviewed = (orderId: string, productId: string) => {
    const key = `${orderId}_${productId}`
    const newSet = [...reviewedItems, key]
    setReviewedItems(newSet)
    localStorage.setItem('customer_reviewed_items', JSON.stringify(newSet))
  }

  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  if (loading || isLoading) {
    return (
      <main className="w-full flex-1 max-w-3xl mx-auto px-4 py-12 pb-28 lg:pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 bg-cream-100 dark:bg-dark-700 rounded" />
          <div className="h-48 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
          <div className="h-48 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
        </div>
      </main>
    )
  }

  return (
    <main className="w-full flex-1 max-w-3xl mx-auto px-4 py-8 pb-28 lg:pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/account" 
          className="p-2 -ml-2 rounded-full hover:bg-cream-100 dark:hover:bg-white/5 transition-colors text-dark-800 dark:text-white"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white flex items-center gap-3">
          <Package size={28} className="text-brand-400" />
          My Orders
        </h1>
      </div>

      {!orders?.length ? (
        <motion.div {...sectionMotion} className="bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-brand-400/15 py-24 text-center shadow-sm">
          <ShoppingBag size={48} className="text-brand-400/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-dark-800 dark:text-white mb-2">No orders yet</h2>
          <p className="text-dark-800/50 dark:text-white/50 text-sm mb-6">Looks like you haven't placed any trackable orders yet.</p>
          <Link to="/" className="inline-block bg-brand-400 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, idx) => {
            const currentStepIndex = STATUS_STEPS.indexOf(order.status)
            const isCancelled = order.status === 'cancelled'
            
            return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-brand-400/15 p-5 sm:p-7 shadow-sm"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-dark-800 dark:text-white text-lg">#{order.id.slice(-6).toUpperCase()}</span>
                      {isCancelled && (
                        <span className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <div className="text-dark-800/50 dark:text-white/50 text-sm font-medium mt-1 space-y-0.5">
                      <p>
                        Placed: {new Date(order.created_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(order.created_at).toLocaleTimeString('en-GH', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {order.status === 'delivered' && (
                        <p className="text-green-600 dark:text-green-400">
                          Delivered: {order.delivered_at 
                            ? `${new Date(order.delivered_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })} at ${new Date(order.delivered_at).toLocaleTimeString('en-GH', { hour: 'numeric', minute: '2-digit' })}` 
                            : 'Order completed'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold text-brand-400">{formatPrice(order.total)}</p>
                    <p className="text-dark-800/50 dark:text-white/50 text-sm">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Visual Status Tracker */}
                {!isCancelled && (
                  <div className="relative mb-8 mt-2 px-2 sm:px-6">
                    <div className="absolute top-1/2 left-6 right-6 h-1 bg-cream-100 dark:bg-dark-700 -translate-y-1/2 rounded-full hidden sm:block" />
                    <OrderStatusProgress currentStepIndex={currentStepIndex} />
                    
                    <div className="flex flex-col sm:flex-row justify-between relative gap-4 sm:gap-0">
                      {STATUS_STEPS.map((step, i) => {
                        const isCompleted = i <= currentStepIndex
                        const isCurrent = i === currentStepIndex
                        
                        let Icon = Clock
                        if (step === 'shipped') Icon = Truck
                        if (step === 'delivered') Icon = CheckCircle
                        if (step === 'confirmed' || step === 'processing') Icon = Package

                        return (
                          <div key={step} className="flex flex-row sm:flex-col items-center gap-3 sm:gap-2 z-10 relative">
                            {/* Mobile timeline line */}
                            <div className="absolute left-4 top-10 bottom-[-20px] w-0.5 bg-cream-100 dark:bg-dark-700 block sm:hidden" />
                            {isCompleted && i !== STATUS_STEPS.length - 1 && (
                              <div className="absolute left-4 top-10 bottom-[-20px] w-0.5 bg-brand-400 block sm:hidden" />
                            )}
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border-2 ${
                              isCompleted 
                                ? 'bg-brand-400 border-brand-400 text-white' 
                                : 'bg-white dark:bg-dark-800 border-cream-200 dark:border-dark-600 text-dark-800/30 dark:text-white/30'
                            } ${isCurrent ? 'ring-4 ring-brand-400/20' : ''}`}>
                              <Icon size={16} />
                            </div>
                            <div className="sm:text-center mt-1 sm:mt-0">
                              <p className={`text-xs font-bold uppercase tracking-wider ${
                                isCompleted ? 'text-dark-800 dark:text-white' : 'text-dark-800/40 dark:text-white/40'
                              }`}>
                                {step}
                              </p>
                              {isCurrent && (
                                <p className="text-[10px] text-brand-400 font-semibold mt-0.5 sm:mt-1 hidden sm:block">Current Status</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="bg-cream-50/50 dark:bg-white/5 rounded-2xl p-4 border border-cream-100 dark:border-white/5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40 mb-3">Order Items</p>
                  {order.items.map((item: any, i: number) => {
                    const reviewKey = `${order.id}_${item.product_id}`
                    const isReviewed = reviewedItems.includes(reviewKey)
                    
                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <img src={item.product_image || 'https://placehold.co/100x100/f3f4f6/9ca3af?text=?'} alt="" className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-dark-800 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-dark-800 dark:text-white text-sm font-semibold truncate">{item.product_title}</p>
                            <p className="text-dark-800/50 dark:text-white/50 text-xs mt-0.5">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 pl-16 sm:pl-0">
                          <span className="text-dark-800 dark:text-white text-sm font-bold">{formatPrice(item.price)}</span>
                          {order.status === 'delivered' && (
                            <button
                              type="button"
                              disabled={isReviewed}
                              onClick={() => {
                                setReviewTarget({ item, orderId: order.id })
                                setReviewModalOpen(true)
                              }}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                                isReviewed 
                                  ? 'bg-cream-100 dark:bg-white/5 text-dark-800/30 dark:text-white/30 cursor-not-allowed'
                                  : 'bg-brand-50 hover:bg-brand-100 text-brand-600 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 dark:text-brand-400'
                              }`}
                            >
                              {isReviewed ? <CheckCircle size={14} /> : <Edit3 size={14} />}
                              {isReviewed ? 'Reviewed' : 'Review'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Financial Breakdown (compact) */}
                <div className="mt-4 pt-4 border-t border-cream-100 dark:border-white/5 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-dark-800/60 dark:text-white/60">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-dark-800/60 dark:text-white/60">
                    <span>Delivery</span>
                    <span>{formatPrice(order.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-dark-800 dark:text-white mt-1 pt-1 border-t border-cream-100 dark:border-white/5">
                    <span>Total</span>
                    <span>{formatPrice(order.total)}</span>
                  </div>
                </div>

              </motion.div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalOpen && reviewTarget && (
          <ReviewModal 
            onClose={() => {
              setReviewModalOpen(false)
              setTimeout(() => setReviewTarget(null), 300)
            }} 
            item={reviewTarget.item}
            userName={user?.user_metadata?.full_name || 'Customer'}
            userEmail={user?.email || ''}
            onSuccess={() => markAsReviewed(reviewTarget.orderId, reviewTarget.item.product_id)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function ReviewModal({ 
  onClose, 
  item, 
  userName,
  userEmail,
  onSuccess 
}: { 
  onClose: () => void, 
  item: any, 
  userName: string,
  userEmail: string,
  onSuccess: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    
    setSubmitting(true)
    try {
      // We store the product URL or identifier in page_url so it can be tied back if needed
      const productUrl = `/product/${item.product_slug || item.product_id}`
      
      const { error } = await supabase.from('site_reviews').insert({
        name: userName,
        email: userEmail,
        rating,
        message: comment.trim() || `Rated ${rating} stars.`,
        page_url: productUrl,
      })

      if (error) throw error

      toast.success('Review submitted successfully! Thank you.')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error('Failed to submit review: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-dark-900/40 backdrop-blur-sm pointer-events-auto"
      />
      <motion.div
        initial={{ opacity: 0, y: '100%', scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-[110] w-full sm:max-w-md bg-white dark:bg-dark-800 sm:rounded-3xl rounded-t-3xl border border-cream-200 dark:border-white/10 shadow-2xl p-6 pointer-events-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-dark-800/40 dark:text-white/40 hover:bg-cream-100 dark:hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-display font-bold text-dark-800 dark:text-white mb-1">
          Review Product
        </h3>
        <p className="text-sm text-dark-800/60 dark:text-white/60 mb-6 truncate pr-8">
          {item.product_title}
        </p>

        <div className="flex flex-col items-center gap-6">
          {/* Star picker */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="outline-none transition-transform hover:scale-110 focus:scale-110"
              >
                <Star
                  size={40}
                  className={`transition-colors ${
                    (hoverRating || rating) >= star
                      ? 'text-brand-400 fill-brand-400 drop-shadow-sm'
                      : 'text-cream-300 dark:text-white/20'
                  }`}
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Tell us what you liked (or didn't like) about this product..."
            rows={4}
            className="w-full bg-cream-50 dark:bg-dark-900 border border-cream-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-dark-800 dark:text-white placeholder-dark-800/40 dark:placeholder-white/30 outline-none focus:border-brand-400 transition-colors resize-none"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full bg-brand-400 hover:bg-brand-500 disabled:bg-cream-200 disabled:text-dark-800/40 dark:disabled:bg-white/5 dark:disabled:text-white/30 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </motion.div>
    </>
  )
}
