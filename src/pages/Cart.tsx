import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trash, Plus, Minus, ShoppingBag, CheckCircle, Heart } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCartStore, getCartItemUnitPrice, getCartItemKey } from '../store/cartStore'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { buildWhatsAppUrl, buildCartWhatsAppMessage, effectivePrice, formatPhoneNumber, detectGhanaNetwork, validateGhanaPhoneNumber } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ui/ProductCard'
import { saveOfflineOrder } from '../lib/offlineOrders'
import { trackOrderPlaced } from '../components/ui/AppReviewPrompt'
import Image from '../components/ui/Image'
import { useStoreContext } from '../contexts/StoreContext'
import { useWishlistStore } from '../store/wishlistStore'
import { useSignInStore } from '../store/signInStore'

export default function Cart() {
  useDocumentTitle('Your Cart')
  const formatPrice = useCurrencyFormatter()
  const { items, removeItem, updateQuantity, setItems, clearCart } = useCartStore()
  const settings = useStoreSettings()
  const { user, profile } = useCustomerSession()
  const storeContext = useStoreContext()
  const currentStoreId = storeContext.storeId
  const toggleWishlist = useWishlistStore(s => s.toggle)
  const isWishlisted = useWishlistStore(s => s.has)
  const openSignIn = useSignInStore(s => s.openModal)

  // Filter items to show only this store's items if we are in a merchant context
  const filteredItems = useMemo(() => {
    if (currentStoreId) {
      return items.filter(i => i.product.store_id === currentStoreId)
    }
    return items
  }, [items, currentStoreId])

  const uniqueStoreIds = useMemo(() => Array.from(new Set(filteredItems.map(i => i.product.store_id || 'platform'))), [filteredItems])
  const isMultiMerchantCart = uniqueStoreIds.length > 1
  const merchantStoreId = currentStoreId || (uniqueStoreIds.length === 1 && uniqueStoreIds[0] !== 'platform' ? uniqueStoreIds[0] : null)

  const { data: storesInfo } = useQuery({
    queryKey: ['cart-stores-info', uniqueStoreIds],
    queryFn: async () => {
      const realStoreIds = uniqueStoreIds.filter(id => id !== 'platform')
      if (realStoreIds.length === 0) return []
      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', realStoreIds)
      return data || []
    },
    enabled: uniqueStoreIds.length > 0,
  })

  const { data: merchantStore } = useQuery({
    queryKey: ['cart-merchant-store', merchantStoreId],
    queryFn: async () => {
      if (!merchantStoreId || currentStoreId) return null
      const { data } = await supabase
        .from('stores')
        .select('whatsapp_number, currency, whatsapp_template, name, owner_id')
        .eq('id', merchantStoreId)
        .maybeSingle()
      return data
    },
    enabled: !!merchantStoreId && !currentStoreId,
  })

  const activeStore = currentStoreId
    ? {
        whatsapp_number: storeContext.whatsappNumber,
        currency: storeContext.settings.currency || 'GHS',
        whatsapp_template: storeContext.settings.whatsapp_template,
        name: storeContext.storeName,
        owner_id: storeContext.ownerId,
      }
    : merchantStore

  const subtotal = useMemo(() => filteredItems.reduce((sum, i) => sum + getCartItemUnitPrice(i) * i.quantity, 0), [filteredItems])
  const minimumOrderAmount = storeContext.minimumOrderAmount || 0
  const isBelowMinimum = minimumOrderAmount > 0 && subtotal < minimumOrderAmount
  // Per-product delivery: take the highest fee across all cart items (one delivery trip)
  const baseDeliveryFee = useMemo(() => filteredItems.reduce(
    (max, item) => Math.max(max, Number(item.product.delivery_fee) || 0),
    0
  ), [filteredItems])

  const [deliveryMethod, setDeliveryMethod] = useState<'local' | 'standard' | 'shipping'>('standard')

  const deliveryFee = useMemo(() => {
    if (deliveryMethod === 'local') {
      return baseDeliveryFee > 0 ? 5 : 0
    }
    if (deliveryMethod === 'shipping') {
      return baseDeliveryFee + 25
    }
    return baseDeliveryFee
  }, [deliveryMethod, baseDeliveryFee])

  // Fetch active store discounts
  const { data: discounts } = useQuery({
    queryKey: ['store-discounts', currentStoreId],
    queryFn: async () => {
      let query = supabase.from('discounts').select('*').eq('active', true)
      if (currentStoreId) {
        query = query.eq('store_id', currentStoreId)
      } else {
        query = query.is('store_id', null)
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: true,
  })

  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCodeRule, setAppliedPromoCodeRule] = useState<any>(null)
  const [promoCodeError, setPromoCodeError] = useState('')

  // 1. Calculate Auto-Applied Discounts
  const autoDiscountAmount = useMemo(() => {
    if (!discounts || discounts.length === 0) return 0
    let totalAutoDiscount = 0

    // Auto rules have no promo code
    const autoRules = discounts.filter(d => !d.code)

    for (const item of filteredItems) {
      const itemPrice = getCartItemUnitPrice(item)
      
      const matchingRules = autoRules.filter(d => {
        if (d.min_order_amount > 0 && subtotal < d.min_order_amount) return false
        if (d.type === 'product' && d.target_id === item.product.id) return true
        if (d.type === 'category' && d.target_id && item.product.category && d.target_id.trim().toLowerCase() === item.product.category.trim().toLowerCase()) return true
        if (d.type === 'storewide') return true
        return false
      })

      if (matchingRules.length > 0) {
        let bestItemDiscount = 0
        for (const rule of matchingRules) {
          let itemDiscount = 0
          if (rule.discount_type === 'percentage') {
            itemDiscount = itemPrice * (Number(rule.value) / 100) * item.quantity
          } else {
            if (rule.type === 'storewide') {
              itemDiscount = Number(rule.value) / filteredItems.length
            } else {
              itemDiscount = Math.min(itemPrice, Number(rule.value)) * item.quantity
            }
          }
          bestItemDiscount = Math.max(bestItemDiscount, itemDiscount)
        }
        totalAutoDiscount += bestItemDiscount
      }
    }

    return Math.min(totalAutoDiscount, subtotal)
  }, [discounts, filteredItems, subtotal])

  // 2. Calculate Promo Code Discount
  const promoDiscountAmount = useMemo(() => {
    if (!appliedPromoCodeRule) return 0
    const rule = appliedPromoCodeRule
    if (rule.min_order_amount > 0 && subtotal < rule.min_order_amount) return 0

    let discount = 0
    if (rule.type === 'storewide') {
      if (rule.discount_type === 'percentage') {
        discount = subtotal * (Number(rule.value) / 100)
      } else {
        discount = Number(rule.value)
      }
    } else {
      for (const item of filteredItems) {
        const matches = 
          (rule.type === 'product' && rule.target_id === item.product.id) ||
          (rule.type === 'category' && rule.target_id && item.product.category && rule.target_id.trim().toLowerCase() === item.product.category.trim().toLowerCase())

        if (matches) {
          const itemPrice = getCartItemUnitPrice(item)
          if (rule.discount_type === 'percentage') {
            discount += itemPrice * (Number(rule.value) / 100) * item.quantity
          } else {
            discount += Math.min(itemPrice, Number(rule.value)) * item.quantity
          }
        }
      }
    }

    return Math.min(discount, subtotal)
  }, [appliedPromoCodeRule, filteredItems, subtotal])

  const discountAmount = useMemo(() => {
    return Math.min(autoDiscountAmount + promoDiscountAmount, subtotal)
  }, [autoDiscountAmount, promoDiscountAmount, subtotal])

  const grandTotal = Math.max(0, subtotal + deliveryFee - discountAmount)

  const handleApplyPromoCode = () => {
    setPromoCodeError('')
    if (!promoCodeInput.trim()) return

    if (!discounts || discounts.length === 0) {
      setPromoCodeError('Invalid promo code')
      return
    }

    const rule = discounts.find(
      d => d.code && d.code.toLowerCase() === promoCodeInput.trim().toLowerCase()
    )

    if (!rule) {
      setPromoCodeError('Invalid promo code')
      setAppliedPromoCodeRule(null)
      return
    }

    if (rule.min_order_amount > 0 && subtotal < rule.min_order_amount) {
      setPromoCodeError(`Min. order of ${formatPrice(rule.min_order_amount)} required`)
      setAppliedPromoCodeRule(null)
      return
    }

    setAppliedPromoCodeRule(rule)
    toast.success(`Promo code "${rule.code}" applied!`)
  }

  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [customerName, setCustomerName] = useState(() => {
    if (profile?.display_name) return profile.display_name
    if (user?.id) return localStorage.getItem(`catalog_name_${user.id}`) || ''
    return ''
  })
  const [customerPhone, setCustomerPhone] = useState(() => {
    if (profile?.phone) return profile.phone
    if (user?.id) return localStorage.getItem(`catalog_phone_${user.id}`) || ''
    return ''
  })
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (profile?.address) return profile.address
    if (user?.id) return localStorage.getItem(`catalog_address_${user.id}`) || ''
    return ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Backfill checkout fields when profile loads asynchronously (e.g. slow Supabase fetch)
  useEffect(() => {
    if (!profile) return
    setCustomerName(prev => prev || profile.display_name || '')
    setCustomerPhone(prev => prev || profile.phone || '')
    setCustomerAddress(prev => prev || profile.address || '')
  }, [profile])

  const detectedNetwork = detectGhanaNetwork(customerPhone)

  const submitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customerName || !customerPhone) {
      setSubmitError('Please provide your name and phone number.')
      return
    }

    if (!validateGhanaPhoneNumber(customerPhone)) {
      setSubmitError('Please enter a valid 10-digit Ghanaian phone number (e.g. 024XXXXXXX).')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    const orderId = crypto.randomUUID()
    const selectedOptionText = 
      deliveryMethod === 'local' ? 'Local Walk (KNUST environs)' :
      deliveryMethod === 'shipping' ? 'Intercity Shipping' :
      'Standard Delivery'
    
    const orderPayload = {
      id: orderId,
      store_id: merchantStoreId,
      customer_id: user?.id || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: `${customerAddress}\n\n[Delivery Option: ${selectedOptionText}]`,
      items: filteredItems.map(i => ({
        product_id: i.product.id,
        product_title: i.selected_variant ? `${i.product.title} (${i.selected_variant.name})` : i.product.title,
        product_image: i.selected_variant?.image_url || i.product.images?.[0] || '',
        price: getCartItemUnitPrice(i),
        quantity: i.quantity,
        variant_name: i.selected_variant?.name || null,
      })),
      subtotal,
      delivery_fee: deliveryFee,
      discount_amount: discountAmount,
      total: grandTotal,
      currency: settings.currency || 'GHS',
      payment_method: 'whatsapp',
      payment_status: 'pending',
      status: 'pending'
    }

    const orderIdShort = orderId.split('-')[0].toUpperCase()

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
      } else if (activeStore?.owner_id) {
        // Trigger push notification to the merchant
        supabase.functions.invoke('notify-new-arrival', {
          body: {
            user_id: activeStore.owner_id,
            title: `New Order #${orderIdShort}`,
            body: `${customerName} just placed an order for ${formatPrice(grandTotal)}.`,
            click_url: `/admin/orders`
          }
        }).catch(err => console.error('Push error:', err))
      }
    }

    setIsSubmitting(false)

    const targetCurrency = activeStore?.currency || settings.currency || 'GHS'
    const targetTemplate = activeStore?.whatsapp_template || settings.whatsapp_template
    const targetNumber = activeStore?.whatsapp_number || settings.whatsapp_number || '233000000000'

    const baseMessage = buildCartWhatsAppMessage(
      filteredItems.map(i => {
        const variantText = i.selected_variant ? ` (${i.selected_variant.name})` : ''
        const sizeText = i.selected_size ? ` [Size: ${i.selected_size}]` : ''
        const colorText = i.selected_color ? ` [Color: ${i.selected_color}]` : ''
        return { 
          title: `${i.product.title}${variantText}${sizeText}${colorText}`, 
          qty: i.quantity, 
          price: getCartItemUnitPrice(i),
          url: currentStoreId 
            ? `${window.location.origin}/s/${storeContext.storeSlug}/product/${i.product.id}`
            : `${window.location.origin}/product/${i.product.id}`
        }
      }),
      subtotal,
      deliveryFee,
      targetCurrency,
      targetTemplate,
      discountAmount
    )
    
    const finalMessage = `*Order ID: #${orderIdShort}*\n\n${baseMessage}\n\n*Delivery Method:* ${selectedOptionText}\n*Delivery Address:* ${customerAddress}`

    const url = buildWhatsAppUrl(targetNumber, finalMessage)
    
    trackOrderPlaced()
    if (currentStoreId) {
      setItems(items.filter(i => i.product.store_id !== currentStoreId))
    } else {
      clearCart()
    }
    window.open(url, '_blank')
    setIsCheckingOut(false)
  }

  const shopPath = storeContext.storeSlug ? `/s/${storeContext.storeSlug}` : '/shop'

  if (filteredItems.length === 0) {
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
          <Link to={shopPath} className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Start Shopping
          </Link>
        </motion.div>
        
        <RecommendedProducts storeId={currentStoreId} />
      </main>
    )
  }

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-10 pb-28 lg:pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to={shopPath} className="inline-flex items-center gap-2 text-dark-800/60 dark:text-white/50 hover:text-brand-400 text-sm mb-2 transition-colors">
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
                    name="name"
                    type="text"
                    autoComplete="name"
                    inputMode="text"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="input w-full"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium">Phone Number</label>
                    {detectedNetwork && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase transition-all tracking-wider shadow-sm ${
                        detectedNetwork === 'MTN' ? 'bg-[#FFCC00] text-black border border-[#e5b800]' :
                        detectedNetwork === 'Telecel' ? 'bg-[#E60000] text-white border border-[#cc0000]' :
                        detectedNetwork === 'AT' ? 'bg-[#0070b8] text-white border border-[#005a94]' :
                        ''
                      }`}>
                        {detectedNetwork}
                      </span>
                    )}
                  </div>
                  <input
                    name="tel"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="next"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(formatPhoneNumber(e.target.value))}
                    className={`input w-full transition-all ${
                      customerPhone && !validateGhanaPhoneNumber(customerPhone)
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                        : ''
                    }`}
                    placeholder="e.g. 024XXXXXXX"
                  />
                  {customerPhone && !validateGhanaPhoneNumber(customerPhone) && (
                    <p className="text-red-500 text-[10px] mt-1 font-medium">Please enter a valid 10-digit number</p>
                  )}
                </div>
                <div>
                  <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium mb-2">Delivery Option</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('local')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        deliveryMethod === 'local'
                          ? 'border-brand-400 bg-brand-400/10 text-brand-400'
                          : 'border-cream-200 dark:border-white/10 text-dark-800/70 dark:text-white/60 hover:bg-cream-50 dark:hover:bg-dark-700/30'
                      }`}
                    >
                      <p className="text-xs font-bold">Local KNUST</p>
                      <p className="text-[10px] opacity-80 mt-1">
                        {baseDeliveryFee > 0 ? 'GHS 5.00' : 'Free'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('standard')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        deliveryMethod === 'standard'
                          ? 'border-brand-400 bg-brand-400/10 text-brand-400'
                          : 'border-cream-200 dark:border-white/10 text-dark-800/70 dark:text-white/60 hover:bg-cream-50 dark:hover:bg-dark-700/30'
                      }`}
                    >
                      <p className="text-xs font-bold">Standard City</p>
                      <p className="text-[10px] opacity-80 mt-1">
                        {baseDeliveryFee > 0 ? `GHS ${baseDeliveryFee.toFixed(2)}` : 'Free'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('shipping')}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        deliveryMethod === 'shipping'
                          ? 'border-brand-400 bg-brand-400/10 text-brand-400'
                          : 'border-cream-200 dark:border-white/10 text-dark-800/70 dark:text-white/60 hover:bg-cream-50 dark:hover:bg-dark-700/30'
                      }`}
                    >
                      <p className="text-xs font-bold">Intercity</p>
                      <p className="text-[10px] opacity-80 mt-1">
                        GHS {(baseDeliveryFee + 25).toFixed(2)}
                      </p>
                    </button>
                  </div>
                  <p className="text-gray-400 text-[10px] mt-1.5 leading-snug">
                    {deliveryMethod === 'local' && "Walk-to-customer delivery within KNUST campus environs."}
                    {deliveryMethod === 'standard' && "Courier delivery within Kumasi city environs."}
                    {deliveryMethod === 'shipping' && "Nationwide parcel shipping service across other regions."}
                  </p>
                </div>
                <div>
                  <label className="block text-dark-800/60 dark:text-white/60 text-sm font-medium mb-1">Delivery Address</label>
                  <textarea
                    name="street-address"
                    autoComplete="street-address"
                    enterKeyHint="done"
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
                  <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={isSubmitting || isBelowMinimum} className="btn-primary flex-1">
                    {isSubmitting ? 'Recording...' : isBelowMinimum ? 'Minimum not met' : 'Complete Order'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          ) : (
            filteredItems.map((item, idx) => {
              const itemKey = getCartItemKey(item)
              const unitPrice = getCartItemUnitPrice(item)
              const itemImg = item.selected_variant?.image_url || item.product.images?.[0] || 'https://placehold.co/80x80/1a1008/d4820a?text=?'
              return (
                <motion.div
                  key={itemKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="card p-4 flex gap-4"
                >
                  <Link to={currentStoreId ? `/s/${storeContext.storeSlug}/product/${item.product.id}` : `/product/${item.product.id}`}>
                    <Image
                      src={itemImg}
                      alt={item.product.title}
                      className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={currentStoreId ? `/s/${storeContext.storeSlug}/product/${item.product.id}` : `/product/${item.product.id}`}>
                      <h3 className="text-dark-800 dark:text-white text-sm font-medium line-clamp-2 hover:text-brand-400 transition-colors">
                        {item.product.title}
                      </h3>
                    </Link>

                    {/* Selected options / variant badge */}
                    {(item.selected_variant || item.selected_size || item.selected_color) && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.selected_variant && (
                          <span className="text-[10px] bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold px-2 py-0.5 rounded-md border border-brand-500/20">
                            Option: {item.selected_variant.name}
                          </span>
                        )}
                        {item.selected_size && (
                          <span className="text-[10px] bg-cream-100 dark:bg-dark-700 text-dark-800/70 dark:text-white/70 font-semibold px-2 py-0.5 rounded-md">
                            Size: {item.selected_size}
                          </span>
                        )}
                        {item.selected_color && (
                          <span className="text-[10px] bg-cream-100 dark:bg-dark-700 text-dark-800/70 dark:text-white/70 font-semibold px-2 py-0.5 rounded-md">
                            Color: {item.selected_color}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      <p className="text-brand-400 font-bold">{formatPrice(unitPrice)}</p>
                      <span className="text-[10px] bg-cream-100 dark:bg-dark-700 text-dark-800/60 dark:text-white/60 font-semibold px-2 py-0.5 rounded">
                        {item.product.store_id
                          ? (storesInfo?.find((s: any) => s.id === item.product.store_id)?.name || 'Merchant Store')
                          : 'Platform Store'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {/* Minus / Remove button — morphs to trash icon at qty 1 */}
                        <AnimatePresence mode="wait" initial={false}>
                          {item.quantity === 1 ? (
                            <motion.button
                              key="remove"
                              initial={{ scale: 0.7, rotate: -15 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0.7, rotate: 15 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              onClick={() => removeItem(item.product.id, item.selected_variant?.id)}
                              aria-label="Remove item from cart"
                              title="Remove item"
                              className="w-8 h-8 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center transition-colors border border-red-200 dark:border-red-800/30"
                            >
                              <Trash size={13} weight="bold" />
                            </motion.button>
                          ) : (
                            <motion.button
                              key="minus"
                              initial={{ scale: 0.7 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0.7 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selected_variant?.id)}
                              aria-label="Decrease quantity"
                              className="w-8 h-8 bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-full flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                            >
                              <Minus size={12} weight="bold" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                        <span className="text-dark-800 dark:text-white font-semibold text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selected_variant?.id)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 bg-cream-100 dark:bg-dark-700 hover:bg-brand-400 hover:text-white rounded-full flex items-center justify-center transition-colors text-dark-800 dark:text-white"
                        >
                          <Plus size={12} weight="bold" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-dark-800/70 dark:text-white/60 text-sm font-medium mr-1">{formatPrice(unitPrice * item.quantity)}</p>
                        {/* Save for Later button */}
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => {
                            if (!user) {
                              openSignIn('Sign in to save items to your wishlist.')
                              return
                            }
                            if (!isWishlisted(item.product.id)) {
                              toggleWishlist(item.product)
                            }
                            removeItem(item.product.id, item.selected_variant?.id)
                            toast.success(`"${item.product.title.slice(0, 28)}${item.product.title.length > 28 ? '…' : ''}" saved to wishlist`, {
                              icon: '❤️',
                            })
                          }}
                          aria-label="Save for later"
                        title="Save for later"
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                          isWishlisted(item.product.id)
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-800/30'
                            : 'bg-cream-100 dark:bg-dark-700 text-dark-800/50 dark:text-white/40 border-cream-200 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800/30'
                        }`}
                      >
                        <Heart size={12} weight={isWishlisted(item.product.id) ? 'fill' : 'regular'} />
                        <span className="hidden sm:inline">{isWishlisted(item.product.id) ? 'Saved' : 'Save'}</span>
                      </motion.button>
                      {/* Hard remove */}
                      <button
                        onClick={() => removeItem(item.product.id, item.selected_variant?.id)}
                        aria-label="Remove item"
                        title="Remove"
                        className="text-dark-800/30 dark:text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                </motion.div>
              )
            })
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="glass rounded-3xl p-5 sticky top-24 border border-brand-400/20">
            <h2 className="text-dark-800 dark:text-white font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 mb-4">
              {filteredItems.map(item => {
                const key = getCartItemKey(item)
                const unitPrice = getCartItemUnitPrice(item)
                const titleWithOpt = item.selected_variant
                  ? `${item.product.title} (${item.selected_variant.name})`
                  : item.product.title
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-dark-800/60 dark:text-white/50 truncate pr-2">
                      {titleWithOpt.length > 28 ? titleWithOpt.slice(0, 28) + '…' : titleWithOpt}
                    </span>
                    <span className="text-dark-800 dark:text-white flex-shrink-0 font-medium">
                      {formatPrice(unitPrice * item.quantity)}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Promo Code Input */}
            {currentStoreId && !isMultiMerchantCart && (
              <div className="mb-4 pt-3 border-t border-cream-200/40 dark:border-white/5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/30 mb-1.5">
                  Have a Promo Code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCodeInput}
                    onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="input py-2 text-xs flex-1 uppercase font-mono border-cream-200 dark:border-white/10"
                    disabled={!!appliedPromoCodeRule}
                  />
                  {appliedPromoCodeRule ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedPromoCodeRule(null)
                        setPromoCodeInput('')
                      }}
                      className="btn-ghost py-2 px-3 text-xs border border-red-200 dark:border-red-900/30 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyPromoCode}
                      className="btn-primary py-2 px-4 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Apply
                    </button>
                  )}
                </div>
                {promoCodeError && (
                  <p className="text-red-500 text-[10px] mt-1 font-medium">{promoCodeError}</p>
                )}
                {appliedPromoCodeRule && (
                  <p className="text-green-600 dark:text-green-400 text-[10px] mt-1 font-medium flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    Code "{appliedPromoCodeRule.code}" applied!
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-cream-200 dark:border-white/10 pt-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-dark-800/70 dark:text-white/60">Subtotal</span>
                <span className="text-dark-800 dark:text-white font-medium">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
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
            {isMultiMerchantCart && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-2xl p-4 mb-4 text-xs text-red-600 dark:text-red-400">
                <p className="font-bold mb-1">Multi-Store Checkout Blocked</p>
                <p>Your cart contains items from multiple stores. Please check out from one store at a time to ensure correct order routing.</p>
              </div>
            )}
            {!isMultiMerchantCart && isBelowMinimum && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-4 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-bold mb-1">Minimum Order Amount Not Met</p>
                <p>This store requires a minimum order of {formatPrice(minimumOrderAmount)}. Please add more items to proceed.</p>
              </div>
            )}
            {isMultiMerchantCart ? (
              <button disabled className="btn-primary w-full justify-center py-4 text-base opacity-50 cursor-not-allowed">
                Checkout Blocked
              </button>
            ) : isBelowMinimum ? (
              <button disabled className="btn-primary w-full justify-center py-4 text-base opacity-50 cursor-not-allowed">
                Minimum order not met
              </button>
            ) : isCheckingOut ? (
              <button disabled className="btn-primary w-full justify-center py-4 text-base opacity-50 cursor-not-allowed">
                Fill details to complete
              </button>
            ) : (
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsCheckingOut(true)} className="btn-primary w-full justify-center py-4 text-base">
                Proceed to Checkout
              </motion.button>
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

function RecommendedProducts({ storeId }: { storeId?: string | null }) {
  const { data: featuredProducts, isLoading } = useProducts({
    featured: true,
    storeId: storeId ?? undefined
  })

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
