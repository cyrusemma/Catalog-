import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trash, Plus, Minus, ShoppingBag } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useCartStore } from '../store/cartStore'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { buildWhatsAppUrl, buildCartWhatsAppMessage, effectivePrice } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ui/ProductCard'
import { saveOfflineOrder } from '../lib/offlineOrders'
import { trackOrderPlaced } from '../components/ui/AppReviewPrompt'

export default function Cart() {
  useDocumentTitle('Your Cart')
  const formatPrice = useCurrencyFormatter()
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore()
  const settings = useStoreSettings()
  const { user } = useCustomerSession()

  const storeIds = useMemo(() => Array.from(new Set(items.map(i => i.product.store_id).filter(Boolean))), [items])
  const merchantStoreId = storeIds.length === 1 ? storeIds[0] : null

  const { data: merchantStore } = useQuery({
    queryKey: ['cart-merchant-store', merchantStoreId],
    queryFn: async () => {
      if (!merchantStoreId) return null
      const { data } = await supabase
        .from('stores')
        .select('whatsapp_number, currency, whatsapp_template, name')
        .eq('id', merchantStoreId)
        .maybeSingle()
      return data
    },
    enabled: !!merchantStoreId,
  })

  const subtotal = totalPrice()
  // Per-product delivery: take the highest fee across all cart items (one delivery trip)
  const deliveryFee = items.reduce(
    (max, item) => Math.max(max, Number(item.product.delivery_fee) || 0),
    0
  )
  const grandTotal = subtotal + deliveryFee

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const submitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customerName || !customerPhone) {
      setSubmitError('Please provide your name and phone number.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    const orderId = crypto.randomUUID()
    
    const orderPayload = {
      id: orderId,
      store_id: merchantStoreId,
      customer_id: user?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      items: items.map(i => ({
        product_id: i.product.id,
        product_title: i.product.title,
        product_image: i.product.images?.[0] || '',
        price: effectivePrice(i.product),
        quantity: i.quantity,
      })),
      subtotal,
      delivery_fee: deliveryFee,
      total: grandTotal,
      currency: settings.currency || 'GHS',
      payment_method: 'whatsapp',
      payment_status: 'pending',
      status: 'pending'
    }

    if (!navigator.onLine) {
      saveOfflineOrder(orderPayload)
    } else {
      const { error } = await supabase.from('orders').insert(orderPayload)

      if (error) {
        if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
          saveOfflineOrder(orderPayload)
        } else {
          setIsSubmitting(false)
          console.error(error)
          setSubmitError("There was an error recording your order. Please try again.")
          return
        }
      }
    }

    setIsSubmitting(false)

    const targetCurrency = merchantStore?.currency || settings.currency || 'GHS'
    const targetTemplate = merchantStore?.whatsapp_template || settings.whatsapp_template
    const targetNumber = merchantStore?.whatsapp_number || settings.whatsapp_number || '233000000000'

    const baseMessage = buildCartWhatsAppMessage(
      items.map(i => ({ 
        title: i.product.title, 
        qty: i.quantity, 
        price: effectivePrice(i.product),
        url: `${window.location.origin}/product/${i.product.id}`
      })),
      subtotal,
      deliveryFee,
      targetCurrency,
      targetTemplate
    )
    
    const orderIdShort = orderId.split('-')[0].toUpperCase()
    const finalMessage = `*Order ID: #${orderIdShort}*\n\n${baseMessage}`

    const url = buildWhatsAppUrl(targetNumber, finalMessage)
    
    trackOrderPlaced()
    clearCart()
    window.open(url, '_blank')
    setIsCheckingOut(false)
  }

  if (items.length === 0) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-10 pb-28 lg:pb-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center py-10"
        >
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-500/10 dark:to-brand-500/5 flex items-center justify-center">
              <ShoppingBag size={42} weight="duotone" className="text-brand-400" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full border-2 border-brand-200 dark:border-brand-500/30"
            />
          </div>
          <h2 className="text-xl font-display font-bold text-dark-800 dark:text-white mb-2">Your cart is empty</h2>
          <p className="text-dark-800/50 dark:text-white/40 text-sm max-w-xs mb-6">
            Looks like you haven't added anything yet. Start exploring our collection!
          </p>
          <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Start Shopping
          </Link>
        </motion.div>
        
        <RecommendedProducts />
      </main>
    )
  }

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-10 pb-28 lg:pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/shop" className="inline-flex items-center gap-2 text-dark-800/60 dark:text-white/50 hover:text-brand-400 text-sm mb-2 transition-colors">
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white">Your Cart</h1>
        </div>
        <button onClick={clearCart} className="text-dark-800/40 dark:text-white/30 hover:text-red-500 text-sm transition-colors">
          Clear all
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {isCheckingOut ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h2 className="text-xl font-display font-bold text-dark-800 dark:text-white mb-6">Delivery Details</h2>
              <form onSubmit={submitOrder} className="space-y-4">
                <div>
                  <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="input w-full"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="input w-full"
                    placeholder="+233 20 000 0000"
                  />
                </div>
                <div>
                  <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium mb-1">Delivery Address</label>
                  <textarea
                    rows={3}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="input w-full resize-none"
                    placeholder="Street, City, Landmark (optional)"
                  />
                </div>
                {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsCheckingOut(false)} className="btn-ghost flex-1">
                    Back to Cart
                  </button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? 'Recording...' : 'Complete Order'}
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            items.map((item, idx) => (
              <motion.div
                key={item.product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="card p-4 flex gap-4"
              >
                <Link to={`/product/${item.product.id}`}>
                  <img
                    src={item.product.images?.[0] || 'https://placehold.co/80x80/1a1008/d4820a?text=?'}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.id}`}>
                    <h3 className="text-dark-800 dark:text-white text-sm font-medium line-clamp-2 hover:text-brand-400 transition-colors">
                      {item.product.title}
                    </h3>
                  </Link>
                  <p className="text-brand-400 font-bold mt-1">{formatPrice(effectivePrice(item.product))}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-full flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                      >
                        <Minus size={12} weight="bold" />
                      </button>
                      <span className="text-dark-800 dark:text-white font-semibold text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="w-8 h-8 bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-full flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-dark-800/70 dark:text-white/60 text-sm font-medium">{formatPrice(effectivePrice(item.product) * item.quantity)}</p>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        aria-label="Remove item"
                        className="text-dark-800/40 dark:text-white/30 hover:text-red-500 transition-colors"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-5 sticky top-24 border border-brand-400/20">
            <h2 className="text-dark-800 dark:text-white font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-dark-800/60 dark:text-white/50 truncate pr-2">
                    {item.product.title.length > 25 ? item.product.title.slice(0, 25) + '…' : item.product.title}
                  </span>
                  <span className="text-dark-800 dark:text-white flex-shrink-0 font-medium">
                    {formatPrice(effectivePrice(item.product) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-cream-200 dark:border-white/10 pt-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-800/70 dark:text-white/60">Subtotal</span>
                <span className="text-dark-800 dark:text-white font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-dark-800/70 dark:text-white/60">Delivery</span>
                <span className="text-dark-800 dark:text-white font-medium">
                  {deliveryFee > 0 ? formatPrice(deliveryFee) : 'Free'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-cream-200/60 dark:border-white/10">
                <span className="text-dark-800 dark:text-white font-bold">Total</span>
                <span className="text-brand-400 font-bold text-2xl">{formatPrice(grandTotal)}</span>
              </div>
            </div>
            {isCheckingOut ? (
              <button disabled className="btn-primary w-full justify-center py-4 text-base opacity-50 cursor-not-allowed">
                Fill details to complete
              </button>
            ) : (
              <button onClick={() => setIsCheckingOut(true)} className="btn-primary w-full justify-center py-4 text-base">
                Proceed to Checkout
              </button>
            )}
            <p className="text-dark-800/40 dark:text-white/30 text-xs text-center mt-3">
              {isCheckingOut 
                ? "Your order will be recorded and you'll be redirected to WhatsApp."
                : "Checkout to enter your delivery details."}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

function RecommendedProducts() {
  const { data: featuredProducts, isLoading } = useProducts({ featured: true })

  if (isLoading || !featuredProducts || featuredProducts.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-12 border-t border-cream-200 dark:border-white/10 pt-12">
      <h3 className="text-2xl font-display font-bold text-dark-800 dark:text-white mb-6 text-center">
        You Might Also Like
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {featuredProducts.slice(0, 4).map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
