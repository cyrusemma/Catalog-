import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  BellSlash,
  SignOut,
  User as UserIcon,
  EnvelopeSimple,
  CheckCircle,
  Storefront,
  ArrowSquareOut,
  Package,
  Heart,
  Eye,
  MapPin,
  Ticket,
  ClipboardText,
  ShoppingCartSimple,
  UserPlus,
  MagnifyingGlass,
  CaretLeft
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useCustomerSession } from '../hooks/useCustomerSession'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { useRecentStore } from '../store/recentStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import ProductCard from '../components/ui/ProductCard'
import { toast } from 'sonner'

// Status steps for tracking orders
const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function Account() {
  const { isLoggedIn, user, profile, loading } = useCustomerSession()
  const { pushSubscribed, pushWorking, pushError, supported, toggle } = useNotificationPreferences()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const formatPrice = useCurrencyFormatter()
  
  const [signedOut, setSignedOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'inbox' | 'vouchers' | 'wishlist' | 'followed' | 'recent' | 'address' | 'alerts' | 'store'>('overview')
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu')

  // Address form fields
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  // Sync address fields when profile updates
  useEffect(() => {
    if (profile) {
      const savedLocal = localStorage.getItem(`catalog_address_${user?.id}`)
      const localData = savedLocal ? JSON.parse(savedLocal) : null
      setPhone(profile.phone || localData?.phone || '')
      setAddress(profile.address || localData?.address || '')
    }
  }, [profile, user?.id])

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !isLoggedIn && !signedOut) {
      navigate('/', { replace: true })
    }
  }, [loading, isLoggedIn, signedOut, navigate])

  // 1. Fetch user's own store (merchant credentials)
  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['user-store', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  // 2. Fetch customer order history
  const { data: orders, isLoading: ordersLoading } = useQuery({
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
    enabled: !!user?.id,
  })

  // 3. Fetch active promo codes (vouchers) from DB
  const { data: vouchers, isLoading: vouchersLoading } = useQuery({
    queryKey: ['customer-vouchers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*, store:stores(name, slug)')
        .eq('active', true)
        .not('code', 'is', null)
      if (error) throw error
      return data || []
    }
  })

  // 4. Fetch details of followed stores
  const { data: followedStores, isLoading: followedStoresLoading } = useQuery({
    queryKey: ['followed-stores', profile?.followed_stores],
    queryFn: async () => {
      if (!profile?.followed_stores || profile.followed_stores.length === 0) return []
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, tagline, logo_url')
        .in('id', profile.followed_stores)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.followed_stores && profile.followed_stores.length > 0,
  })

  // 4b. Fetch all discoverable stores (for the "Discover" section)
  const { data: allStores, isLoading: allStoresLoading } = useQuery({
    queryKey: ['all-stores-discover'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, tagline, logo_url')
        .eq('approval_status', 'approved')
      if (error) throw error
      return data || []
    },
    enabled: activeTab === 'followed',
  })

  // 4c. Fetch product stock statuses for all unique product_ids in orders (Buy Again)
  const allOrderProductIds = useMemo(() => {
    if (!orders) return []
    const ids = new Set<string>()
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.product_id) ids.add(item.product_id)
        if (item.product_slug) ids.add(item.product_slug) // use id still
      })
    })
    return [...ids]
  }, [orders])

  const { data: productStockMap } = useQuery({
    queryKey: ['order-products-stock', allOrderProductIds],
    queryFn: async () => {
      if (allOrderProductIds.length === 0) return {}
      const { data, error } = await supabase
        .from('products')
        .select('id, slug, stock_status')
        .in('id', allOrderProductIds)
      if (error) return {}
      const map: Record<string, { slug: string; stock_status: string }> = {}
      data?.forEach(p => { map[p.id] = { slug: p.slug, stock_status: p.stock_status } })
      return map
    },
    enabled: allOrderProductIds.length > 0,
  })

  // Follow / unfollow a store (used in Discover section)
  const [followingInProgress, setFollowingInProgress] = useState<string | null>(null)

  const handleToggleFollow = async (storeId: string, storeName: string) => {
    if (!user || !profile) return
    setFollowingInProgress(storeId)
    try {
      const currentFollows: string[] = profile.followed_stores || []
      const isNowFollowing = currentFollows.includes(storeId)
      const newFollows = isNowFollowing
        ? currentFollows.filter(id => id !== storeId)
        : [...currentFollows, storeId]

      const { error } = await supabase
        .from('profiles')
        .update({ followed_stores: newFollows })
        .eq('id', user.id)

      if (error) throw error

      // Optimistic local mutation
      profile.followed_stores = newFollows
      qc.invalidateQueries({ queryKey: ['customer-profile', user.id] })
      qc.invalidateQueries({ queryKey: ['followed-stores'] })

      if (isNowFollowing) {
        toast.success(`Unfollowed ${storeName}`)
      } else {
        toast.success(`Now following ${storeName}! 🎉`)
      }
    } catch {
      toast.error('Could not update follow status. Please try again.')
    } finally {
      setFollowingInProgress(null)
    }
  }

  // 5. Gather Zustand stores data (Recently viewed, Wishlist)
  const recentProducts = useRecentStore(s => s.recent)
  const wishlistItems = useWishlistStore(s => s.items)

  // 6. Dynamic notification system computed from order logs
  const notifications = useMemo(() => {
    const list = [
      {
        id: 'welcome',
        title: 'Welcome to Catalog!',
        body: 'Start exploring customized vendor shops, bookmark your favorites, and manage your account details.',
        time: profile?.created_at ? new Date(profile.created_at) : new Date(),
        type: 'info'
      }
    ]
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const orderShort = order.id.split('-')[0].toUpperCase()
        if (order.status !== 'pending') {
          list.push({
            id: `${order.id}-status`,
            title: `Order #${orderShort} updated`,
            body: `Your order is now status: ${order.status.toUpperCase()}`,
            time: new Date(order.created_at), // Fallback if no specific change logs
            type: order.status === 'delivered' ? 'success' : 'info'
          })
        }
      })
    }
    return list.sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [profile?.created_at, orders])

  const signOut = async () => {
    setSignedOut(true)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingAddress(true)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim(),
          address: address.trim()
        })
        .eq('id', user.id)

      localStorage.setItem(`catalog_address_${user.id}`, JSON.stringify({
        phone: phone.trim(),
        address: address.trim()
      }))

      if (updateError) {
        // Fallback works, but warn in dev log
        console.warn('DB write failed, fallback saved locally:', updateError.message)
      }
      
      qc.invalidateQueries({ queryKey: ['customer-profile', user.id] })
      toast.success('Address Book updated!')
      setActiveTab('overview')
    } catch {
      toast.error('Failed to update Address details.')
    } finally {
      setSavingAddress(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied code: ${code}`)
  }

  if (loading || !profile) {
    return (
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-12 pb-28 lg:pb-12">
        <div className="animate-pulse flex gap-6">
          <div className="hidden lg:block w-64 h-96 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
          <div className="flex-1 space-y-4">
            <div className="h-8 w-40 bg-cream-100 dark:bg-dark-700 rounded" />
            <div className="h-32 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
            <div className="h-48 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
          </div>
        </div>
      </main>
    )
  }

  const initials = (profile.display_name || profile.email || '?')
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  const sidebarItems = [
    { id: 'overview', label: 'Account Overview', icon: UserIcon },
    { id: 'orders', label: 'My Orders', icon: Package, count: orders?.length },
    { id: 'inbox', label: 'Inbox', icon: ClipboardText, count: notifications.length },
    { id: 'vouchers', label: 'Vouchers & Coupons', icon: Ticket, count: vouchers?.length },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistItems.length },
    { id: 'followed', label: 'Followed Sellers', icon: Storefront, count: profile.followed_stores?.length },
    { id: 'recently-viewed', label: 'Recently Viewed', icon: Eye, count: recentProducts.length },
    { id: 'address', label: 'Address Book', icon: MapPin },
    { id: 'alerts', label: 'Notification Settings', icon: Bell },
    { id: 'store', label: 'Merchant Dashboard', icon: Storefront }
  ] as const

  return (
    <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-10 pb-28 lg:pb-10">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
        <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Customer Portal</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white mb-8">My Account</h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className={`w-full lg:w-64 bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 rounded-3xl p-4 space-y-1.5 shadow-sm sticky top-24 ${
          mobileView === 'menu' ? 'block' : 'hidden lg:block'
        }`}>
          <div className="flex items-center gap-3 px-3 py-3 border-b border-cream-100 dark:border-white/5 mb-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-400/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-white font-bold text-sm flex items-center justify-center">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-dark-800 dark:text-white font-semibold text-sm truncate">
                {profile.display_name || 'Customer'}
              </p>
              <p className="text-dark-800/40 dark:text-white/40 text-[11px] truncate">
                {profile.email}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const active = activeTab === item.id || (item.id === 'recently-viewed' && activeTab === 'recent')
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'recently-viewed') {
                      setActiveTab('recent')
                    } else {
                      setActiveTab(item.id)
                    }
                    setMobileView('content')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left text-sm font-semibold transition-all group ${
                    active
                      ? 'bg-brand-400/10 text-brand-400'
                      : 'text-dark-800/60 dark:text-white/60 hover:bg-cream-50 dark:hover:bg-dark-700/30 hover:text-dark-800 dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={16} weight={active ? 'fill' : 'bold'} className="flex-shrink-0" />
                    {item.label}
                  </span>
                  {'count' in item && item.count !== undefined && item.count > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                      active ? 'bg-brand-400 text-white' : 'bg-cream-100 dark:bg-dark-700 text-dark-800/50 dark:text-white/50 group-hover:bg-cream-200 dark:group-hover:bg-dark-600'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <div className="pt-3 mt-3 border-t border-cream-100 dark:border-white/5">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-sm font-semibold text-red-500 hover:bg-red-500/5 transition-colors"
            >
              <SignOut size={16} weight="bold" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Dynamic Display Panel */}
        <div className={`flex-1 w-full min-w-0 ${
          mobileView === 'content' ? 'block' : 'hidden lg:block'
        }`}>
          {mobileView === 'content' && (
            <button
              type="button"
              onClick={() => setMobileView('menu')}
              className="lg:hidden flex items-center gap-1.5 mb-6 text-xs font-bold text-brand-400 hover:text-brand-500 bg-brand-400/10 px-3.5 py-2 rounded-xl border border-brand-400/20 active:scale-95 transition-all"
            >
              <CaretLeft size={14} weight="bold" className="flex-shrink-0" />
              <span>Back to Account Menu</span>
            </button>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* ── Tab: Overview ────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Greeting Banner */}
                  <div className="bg-gradient-to-br from-brand-400 to-brand-500 rounded-3xl p-6 text-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display">Hello, {profile.display_name || 'User'}!</h2>
                      <p className="text-white/80 text-xs mt-1">Welcome back. Manage your address book, check orders, and discover active coupons.</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('address')}
                      className="bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                    >
                      Quick Update Address
                    </button>
                  </div>

                  {/* Overview Cards Grid */}
                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Account Details */}
                    <div className="card p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/35 mb-4">Account Details</h3>
                        <p className="text-dark-800 dark:text-white font-semibold">{profile.display_name}</p>
                        <p className="text-dark-800/60 dark:text-white/50 text-xs mt-1 truncate flex items-center gap-1.5">
                          <EnvelopeSimple size={13} /> {profile.email}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <Link to="/settings" className="text-brand-400 hover:text-brand-500 text-xs font-bold flex items-center gap-1">
                          Edit Profile →
                        </Link>
                        <Link to="/settings" className="text-red-500/70 hover:text-red-500 text-[11px] font-semibold transition-colors">
                          Delete Account
                        </Link>
                      </div>
                    </div>

                    {/* Store Credit Holographic Card */}
                    <div className="relative h-44 rounded-3xl bg-gradient-to-br from-[#1a1c22] via-[#2d323f] to-[#121318] p-5 text-white flex flex-col justify-between overflow-hidden shadow-lg border border-white/5 group hover:shadow-2xl transition-all duration-500">
                      {/* Ambient Holographic Reflection Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-brand-400/0 via-brand-400/10 to-brand-400/20 mix-blend-overlay pointer-events-none group-hover:translate-x-12 transition-transform duration-1000" />
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest font-extrabold font-mono">Catalog Store Credit</span>
                          <h4 className="text-xs text-white/70 font-semibold mt-1">GIFT CARD</h4>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-brand-400/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
                          <Ticket size={18} weight="fill" />
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 font-mono tracking-widest">CARD BALANCE</p>
                        <p className="text-2xl font-bold font-mono text-brand-400 mt-0.5">{formatPrice(profile.store_credit || 0)}</p>
                      </div>
                      <div className="flex justify-between items-end border-t border-white/5 pt-2">
                        <span className="text-[9px] font-mono text-white/40 tracking-wider">**** **** **** {user?.id?.slice(-4) || '0000'}</span>
                        <span className="text-[8px] font-mono text-white/35 uppercase">ACTIVE MEMBER</span>
                      </div>
                    </div>

                    {/* Address Book Widget */}
                    <div className="card p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/35 mb-4">Default Address</h3>
                        {address ? (
                          <div className="space-y-1.5 text-xs text-dark-800/80 dark:text-white/80 leading-relaxed">
                            <p className="font-semibold text-dark-800 dark:text-white">{profile.display_name}</p>
                            <p className="font-mono">{phone}</p>
                            <p className="italic">"{address}"</p>
                          </div>
                        ) : (
                          <p className="text-xs text-dark-800/40 dark:text-white/30 italic">No default address saved. Setup your address book for faster checkouts.</p>
                        )}
                      </div>
                      <button
                        onClick={() => setActiveTab('address')}
                        className="text-brand-400 hover:text-brand-500 text-xs font-bold mt-4 text-left flex items-center gap-1"
                      >
                        {address ? 'Edit Address Book →' : 'Add Shipping Details →'}
                      </button>
                    </div>

                    {/* Newsletter preferences widget */}
                    <div className="card p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/35 mb-4">Newsletter Settings</h3>
                        <p className="text-xs text-dark-800/60 dark:text-white/50 leading-relaxed">
                          Receive notifications about discount offers and brand launches. Push alerts are currently: <span className="font-semibold text-brand-400">{pushSubscribed ? 'ON' : 'OFF'}</span>.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('alerts')}
                        className="text-brand-400 hover:text-brand-500 text-xs font-bold mt-4 text-left flex items-center gap-1"
                      >
                        Manage Alerts Preferences →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Orders ──────────────────────────────────────────── */}
              {activeTab === 'orders' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-2">My Order History</h3>
                  {ordersLoading ? (
                    <div className="space-y-3">
                      <div className="h-32 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-3xl" />
                      <div className="h-32 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-3xl" />
                    </div>
                  ) : !orders || orders.length === 0 ? (
                    <div className="card p-10 text-center">
                      <Package size={48} className="text-brand-400/50 mx-auto mb-4" />
                      <h4 className="font-bold text-dark-800 dark:text-white text-base">No orders yet</h4>
                      <p className="text-xs text-dark-800/55 dark:text-white/50 mt-1 max-w-xs mx-auto mb-4">Your order log is currently empty. Shop storefront products to track status.</p>
                      <Link to="/" className="inline-block bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm">
                        Start Browsing
                      </Link>
                    </div>
                  ) : (
                    orders.map(order => {
                      const currentStepIndex = STATUS_STEPS.indexOf(order.status)
                      const isCancelled = order.status === 'cancelled'
                      const orderShort = order.id.split('-')[0].toUpperCase()

                      return (
                        <div key={order.id} className="card p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-cream-100 dark:border-white/5 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-dark-800 dark:text-white">ORDER #{orderShort}</span>
                                {isCancelled && (
                                  <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">CANCELLED</span>
                                )}
                                {order.status === 'delivered' && (
                                  <span className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">DELIVERED</span>
                                )}
                              </div>
                              <p className="text-[10px] text-dark-800/40 dark:text-white/45 mt-0.5">Placed: {new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-sm font-bold text-brand-400 block">{formatPrice(order.total)}</span>
                              <span className="text-[10px] text-dark-800/50 dark:text-white/50">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {/* Steps progress */}
                          {!isCancelled && (
                            <div className="grid grid-cols-5 gap-2 relative">
                              {STATUS_STEPS.map((step, i) => {
                                const done = i <= currentStepIndex
                                const current = i === currentStepIndex
                                return (
                                  <div key={step} className="flex flex-col items-center">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                                      done ? 'bg-brand-400 border-brand-400 text-white' : 'bg-cream-50 dark:bg-dark-700 border-cream-200 dark:border-white/5 text-dark-800/30 dark:text-white/30'
                                    } ${current ? 'ring-2 ring-brand-400/20' : ''}`}>
                                      {done ? '✓' : i + 1}
                                    </div>
                                    <span className={`text-[8px] uppercase tracking-wider font-bold mt-1.5 truncate max-w-full ${
                                      done ? 'text-dark-800 dark:text-white' : 'text-dark-800/30 dark:text-white/30'
                                    }`}>{step}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Items with images + Buy Again */}
                          <div className="bg-cream-50/50 dark:bg-white/5 rounded-2xl p-3.5 space-y-3 border border-cream-100 dark:border-white/5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-dark-800/35 dark:text-white/30">Items</p>
                            {order.items.map((item: any, i: number) => {
                              const stock = productStockMap?.[item.product_id]
                              const isOutOfStock = stock?.stock_status === 'out_of_stock'
                              const productSlug = stock?.slug || item.product_slug
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  {/* Product image */}
                                  <img
                                    src={item.product_image || 'https://placehold.co/48x48/f3f4f6/9ca3af?text=?'}
                                    alt={item.product_title}
                                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-dark-800 dark:text-white truncate">{item.product_title}</p>
                                    <p className="text-[10px] text-dark-800/50 dark:text-white/45 mt-0.5">Qty: {item.quantity} · {formatPrice(item.price)}</p>
                                  </div>
                                  {/* Buy Again button */}
                                  {productSlug ? (
                                    isOutOfStock ? (
                                      <span className="flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-cream-100 dark:bg-white/5 text-dark-800/30 dark:text-white/30 border border-cream-200 dark:border-white/5 cursor-not-allowed select-none">
                                        Out of Stock
                                      </span>
                                    ) : (
                                      <Link
                                        to={`/product/${productSlug}`}
                                        className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-brand-400/10 hover:bg-brand-400/20 text-brand-500 dark:text-brand-400 border border-brand-400/20 transition-colors"
                                      >
                                        <ShoppingCartSimple size={12} weight="bold" />
                                        Buy Again
                                      </Link>
                                    )
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ── Tab: Inbox ───────────────────────────────────────────── */}
              {activeTab === 'inbox' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white">Message Centre</h3>
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div key={n.id} className="card p-5 flex items-start gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          n.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-brand-400/10 text-brand-400'
                        }`}>
                          <Bell size={16} weight="bold" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <h4 className="font-semibold text-sm text-dark-800 dark:text-white">{n.title}</h4>
                            <span className="text-[10px] text-dark-800/40 dark:text-white/45">{n.time.toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-dark-800/60 dark:text-white/50 mt-1.5 leading-relaxed">{n.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Vouchers ────────────────────────────────────────── */}
              {activeTab === 'vouchers' && (
                <div className="space-y-5">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-2">Available Coupons</h3>
                  {vouchersLoading ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="h-28 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-3xl" />
                      <div className="h-28 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-3xl" />
                    </div>
                  ) : !vouchers || vouchers.length === 0 ? (
                    <div className="card p-10 text-center text-dark-800/40 dark:text-white/30 text-sm">
                      No active store coupons found at this time.
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {vouchers.map(v => (
                        <div key={v.id} className="relative overflow-hidden border-2 border-dashed border-brand-400/40 bg-white dark:bg-dark-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                          {/* Circular notch cutouts for coupon style */}
                          <div className="absolute top-1/2 -left-3.5 w-6 h-6 rounded-full bg-cream-50 dark:bg-dark-900 border-r border-brand-400/20 -translate-y-1/2" />
                          <div className="absolute top-1/2 -right-3.5 w-6 h-6 rounded-full bg-cream-50 dark:bg-dark-900 border-l border-brand-400/20 -translate-y-1/2" />

                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] bg-brand-400/10 text-brand-400 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                                {v.store?.name || 'Catalog General'}
                              </span>
                              <span className="text-xs font-bold text-brand-400">
                                {v.discount_type === 'percentage' ? `${Math.round(v.value)}% OFF` : `${formatPrice(v.value)} OFF`}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-dark-800 dark:text-white">Valid Storewide</p>
                            <p className="text-[10px] text-dark-800/50 dark:text-white/45 mt-1">Min. order: {formatPrice(v.min_order_amount || 0)}</p>
                          </div>

                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-cream-100 dark:border-white/5">
                            <span className="font-mono font-bold text-xs bg-cream-100 dark:bg-dark-700 px-3 py-1.5 rounded-xl text-dark-800 dark:text-white flex-1 text-center select-all">{v.code}</span>
                            <button
                              onClick={() => handleCopyCode(v.code)}
                              className="bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Wishlist ────────────────────────────────────────── */}
              {activeTab === 'wishlist' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white">My Wishlist</h3>
                  {wishlistItems.length === 0 ? (
                    <div className="card p-10 text-center text-dark-800/40 dark:text-white/30 text-sm">
                      Your saved list is empty. Tap the heart icon on products to add items here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {wishlistItems.map((product, i) => (
                        <ProductCard key={product.id} product={product} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Followed Sellers ────────────────────────────────── */}
              {activeTab === 'followed' && (
                <div className="space-y-6">
                  {/* Following */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-dark-800 dark:text-white">Following</h3>
                    {followedStoresLoading ? (
                      <div className="space-y-3">
                        <div className="h-20 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-2xl" />
                        <div className="h-20 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-2xl" />
                      </div>
                    ) : !followedStores || followedStores.length === 0 ? (
                      <div className="card p-8 text-center text-dark-800/40 dark:text-white/30 text-sm">
                        <Storefront size={40} className="text-brand-400/30 mx-auto mb-3" weight="duotone" />
                        <p>You aren't following any merchant shops yet.</p>
                        <p className="text-xs mt-1">Discover merchants below and tap Follow!</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {followedStores.map(fStore => (
                          <div key={fStore.id} className="card p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              {fStore.logo_url ? (
                                <img
                                  src={fStore.logo_url}
                                  alt={fStore.name}
                                  className="w-11 h-11 rounded-xl object-cover border border-cream-200 dark:border-white/10 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-brand-400/10 flex items-center justify-center text-brand-400 flex-shrink-0">
                                  <Storefront size={20} weight="duotone" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-dark-800 dark:text-white truncate">{fStore.name}</h4>
                                <p className="text-[10px] text-dark-800/50 dark:text-white/45 truncate mt-0.5">{fStore.tagline || 'Merchant store'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleToggleFollow(fStore.id, fStore.name)}
                                disabled={followingInProgress === fStore.id}
                                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-cream-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/20 text-dark-800/60 dark:text-white/50 hover:text-red-500 border border-cream-200 dark:border-white/10 transition-all disabled:opacity-50"
                              >
                                {followingInProgress === fStore.id ? '...' : 'Unfollow'}
                              </button>
                              <Link
                                to={`/s/${fStore.slug}`}
                                className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-brand-400/10 hover:bg-brand-400/20 text-brand-500 dark:text-brand-400 border border-brand-400/20 transition-colors"
                              >
                                <ArrowSquareOut size={11} /> Visit
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Discover merchants */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MagnifyingGlass size={16} className="text-brand-400" weight="bold" />
                      <h3 className="text-base font-bold text-dark-800 dark:text-white">Discover Merchants</h3>
                    </div>
                    {allStoresLoading ? (
                      <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-16 bg-cream-100 dark:bg-dark-700 animate-pulse rounded-2xl" />)}
                      </div>
                    ) : (() => {
                      const followedIds = new Set(profile?.followed_stores || [])
                      const unfollowed = (allStores || []).filter(s => !followedIds.has(s.id))
                      if (unfollowed.length === 0) return (
                        <div className="card p-6 text-center text-dark-800/40 dark:text-white/30 text-xs">
                          You're following all available stores! 🎉
                        </div>
                      )
                      return (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {unfollowed.map(s => (
                            <div key={s.id} className="card p-4 flex items-center gap-3">
                              {s.logo_url ? (
                                <img src={s.logo_url} alt={s.name} className="w-11 h-11 rounded-xl object-cover border border-cream-200 dark:border-white/10 flex-shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400/15 to-brand-400/5 flex items-center justify-center text-brand-400 flex-shrink-0">
                                  <Storefront size={20} weight="duotone" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-dark-800 dark:text-white truncate">{s.name}</h4>
                                <p className="text-[10px] text-dark-800/50 dark:text-white/40 truncate mt-0.5">{s.tagline || 'Merchant store'}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleToggleFollow(s.id, s.name)}
                                  disabled={followingInProgress === s.id}
                                  className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-brand-400 hover:bg-brand-500 text-white transition-colors disabled:opacity-50"
                                >
                                  {followingInProgress === s.id
                                    ? <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                                    : <UserPlus size={11} weight="bold" />}
                                  {followingInProgress === s.id ? '' : 'Follow'}
                                </button>
                                <Link
                                  to={`/s/${s.slug}`}
                                  className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-cream-100 dark:bg-white/5 hover:bg-cream-200 dark:hover:bg-white/10 text-dark-800/60 dark:text-white/50 border border-cream-200 dark:border-white/10 transition-colors"
                                >
                                  <ArrowSquareOut size={11} /> View
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ── Tab: Recently Viewed ─────────────────────────────────── */}
              {activeTab === 'recent' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white">Recently Viewed</h3>
                  {recentProducts.length === 0 ? (
                    <div className="card p-10 text-center text-dark-800/40 dark:text-white/30 text-sm">
                      Products you view will be compiled here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {recentProducts.map((product, i) => (
                        <ProductCard key={product.id} product={product} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Address Book ────────────────────────────────────── */}
              {activeTab === 'address' && (
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-4">Edit Address Book</h3>
                  <form onSubmit={handleSaveAddress} className="space-y-4">
                    <div>
                      <label className="block text-dark-800/60 dark:text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g. 024XXXXXXX"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-dark-800/60 dark:text-white/50 text-xs font-bold uppercase tracking-wider mb-1.5">Shipping Address</label>
                      <textarea
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Street details, building number, region, landmarks..."
                        rows={4}
                        className="input w-full resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className="btn-ghost"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="btn-primary"
                      >
                        {savingAddress ? 'Saving...' : 'Save Default Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ── Tab: Notification Settings ───────────────────────────── */}
              {activeTab === 'alerts' && (
                <div className="card p-6 space-y-4">
                  <h3 className="text-lg font-bold text-dark-800 dark:text-white">Push Alert Preferences</h3>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {pushSubscribed ? (
                          <Bell size={18} weight="fill" className="text-brand-400" />
                        ) : (
                          <BellSlash size={18} weight="duotone" className="text-dark-800/40 dark:text-white/40" />
                        )}
                        <h4 className="text-dark-800 dark:text-white font-semibold">New-arrival notifications</h4>
                      </div>
                      <p className="text-dark-800/55 dark:text-white/50 text-xs mt-1.5 leading-relaxed">
                        {!supported
                          ? 'Push notifications are not supported on this device. If you are on an iPhone, please add this app to your Home Screen first.'
                          : pushSubscribed === null
                            ? 'Verifying device support...'
                            : 'Enable push alerts to get notified instantly whenever a new collection goes live.'}
                      </p>
                      {pushError && <p className="text-red-500 text-[10px] mt-2 font-medium">{pushError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={toggle}
                      disabled={pushWorking || !supported || pushSubscribed === null}
                      aria-label="Toggle notifications"
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
                        pushSubscribed ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-700'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          pushSubscribed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {pushSubscribed && (
                    <p className="text-green-600 dark:text-green-400 text-xs font-semibold mt-3 inline-flex items-center gap-1.5">
                      <CheckCircle size={13} weight="fill" /> You will be notified of new product arrivals
                    </p>
                  )}
                </div>
              )}

              {/* ── Tab: Store Setup ─────────────────────────────────────── */}
              {activeTab === 'store' && (
                <div className="card p-6">
                  {storeLoading ? (
                    <div className="animate-pulse h-32 bg-cream-100 dark:bg-dark-700 rounded-3xl" />
                  ) : store ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-dark-800 dark:text-white flex items-center gap-2">
                        <Storefront size={20} className="text-brand-400" />
                        Merchant Storefront Status
                      </h3>
                      <p className="text-xs text-dark-800/60 dark:text-white/50 leading-relaxed">
                        You have successfully registered the merchant storefront: <span className="font-semibold text-brand-400">{store.name}</span>. Click below to manage settings, load products, and inspect orders on your Admin Dashboard.
                      </p>
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Link to="/admin" className="bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm">
                          Manage Store Admin Dashboard
                        </Link>
                        <a href={`/s/${store.slug}`} target="_blank" rel="noreferrer" className="bg-cream-100 dark:bg-dark-700 text-dark-800 dark:text-white hover:bg-cream-200 dark:hover:bg-dark-600 text-xs font-semibold px-4 py-2.5 rounded-xl border border-cream-200 dark:border-white/10 transition-all flex items-center gap-1.5">
                          View Storefront <ArrowSquareOut size={13} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {showCreateWizard ? (
                        <StoreCreationWizard
                          onCancel={() => setShowCreateWizard(false)}
                          onSuccess={() => {
                            setShowCreateWizard(false)
                            qc.invalidateQueries({ queryKey: ['user-store', user?.id] })
                          }}
                        />
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-dark-800 dark:text-white">Become a Merchant</h3>
                          <p className="text-xs text-dark-800/60 dark:text-white/50 leading-relaxed">
                            Create your own online catalog store in minutes. Upload listings, configure custom currencies, and accept orders directly on WhatsApp.
                          </p>
                          <button
                            onClick={() => setShowCreateWizard(true)}
                            className="bg-brand-400 hover:bg-brand-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                          >
                            Launch Store Setup
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

// ─── Multi-Step Store Creation Wizard ─────────────────────────────────────────

const CURRENCIES = ['GHS', 'USD', 'GBP', 'EUR', 'NGN', 'KES', 'ZAR']

function StoreCreationWizard({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const { user } = useCustomerSession()
  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currency, setCurrency] = useState('GHS')

  // Slug availability
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugTimer, setSlugTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setSlug(generated)
    checkSlug(generated)
  }

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(clean)
    checkSlug(clean)
  }

  const checkSlug = (value: string) => {
    setSlugAvailable(null)
    if (slugTimer) clearTimeout(slugTimer)
    if (!value || value.length < 3) return
    setSlugChecking(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', value)
        .maybeSingle()
      setSlugAvailable(!data)
      setSlugChecking(false)
    }, 500)
    const timerId = t as unknown as ReturnType<typeof setTimeout>
    setSlugTimer(timerId)
  }

  const canProceedStep1 = name.trim().length >= 2 && slug.length >= 3 && slugAvailable === true
  const canProceedStep2 = whatsapp.trim().replace(/\D/g, '').length >= 7

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const { error: insertError } = await supabase.from('stores').insert({
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || null,
        whatsapp_number: whatsapp.trim().replace(/\D/g, ''),
        currency,
        owner_id: user?.id,
      })
      if (insertError) throw insertError
      setDone(true)
      setTimeout(onSuccess, 4000)
    } catch (err: any) {
      setError(err.message || 'Failed to create store. Please try again.')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6 space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg"
        >
          <CheckCircle size={32} weight="fill" className="text-white" />
        </motion.div>
        <div>
          <h3 className="text-dark-800 dark:text-white font-bold text-lg">🎉 Your store is live!</h3>
          <p className="text-dark-800/55 dark:text-white/50 text-sm mt-1">
            <span className="font-semibold text-brand-400">{name}</span> is ready to go.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link
            to="/admin"
            className="bg-brand-400 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            Go to Admin Dashboard →
          </Link>
          <a
            href={`/s/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="border border-cream-200 dark:border-white/10 text-dark-800 dark:text-white/80 hover:border-brand-400/40 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            View Storefront <ArrowSquareOut size={13} />
          </a>
        </div>
      </motion.div>
    )
  }

  const steps = ['Identity', 'Contact', 'Review']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-dark-800 dark:text-white text-base">Create Your Storefront</h3>
          <p className="text-xs text-dark-800/45 dark:text-white/35 mt-0.5">Step {step} of 3 — {steps[step - 1]}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-dark-800/40 dark:text-white/30 hover:text-dark-800/70 dark:hover:text-white/60 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((_s, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i + 1 <= step ? 'bg-brand-400' : 'bg-cream-200 dark:bg-dark-600'
          }`} />
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium border border-red-200 dark:border-red-800/30">
          {error}
        </div>
      )}

      {step === 1 && (
        <motion.div
          key="step1"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Store Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aura Styles"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Store URL <span className="text-red-400">*</span>
            </label>
            <div className={`flex items-center bg-cream-100 dark:bg-dark-700 border rounded-xl px-3 py-2.5 text-sm transition-all ${
              slug.length >= 3
                ? slugAvailable === true ? 'border-green-400/60' : slugAvailable === false ? 'border-red-400/60' : 'border-cream-200 dark:border-white/10'
                : 'border-cream-200 dark:border-white/10'
            }`}>
              <span className="text-dark-800/35 dark:text-white/30 text-xs mr-1 flex-shrink-0">{window.location.host}/s/</span>
              <input
                type="text"
                required
                placeholder="aura-styles"
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none p-0 text-sm min-w-0"
              />
              <span className="ml-2 flex-shrink-0 w-4 text-center">
                {slugChecking && (
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                )}
                {!slugChecking && slug.length >= 3 && slugAvailable === true && (
                  <span className="text-green-500 text-xs font-bold">✓</span>
                )}
                {!slugChecking && slug.length >= 3 && slugAvailable === false && (
                  <span className="text-red-400 text-xs font-bold">✗</span>
                )}
              </span>
            </div>
            {slug.length >= 3 && !slugChecking && slugAvailable === false && (
              <p className="text-red-400 text-xs mt-1">This URL is already taken. Try another.</p>
            )}
            {slug.length >= 3 && !slugChecking && slugAvailable === true && (
              <p className="text-green-500 text-xs mt-1">Available ✓</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Tagline <span className="text-dark-800/30 dark:text-white/25 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Your go-to for streetwear"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              maxLength={80}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Next: Contact →
            </button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              WhatsApp Number <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-dark-800/45 dark:text-white/35 mb-2">
              Customers will message you here to place orders. Include country code — e.g. <span className="font-mono">233574090147</span>.
            </p>
            <input
              type="tel"
              required
              placeholder="233574090147"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              className="w-full bg-cream-100 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-dark-800/60 dark:text-white/45 mb-1.5">
              Currency
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    currency === c
                      ? 'bg-brand-400 text-white border-brand-400 shadow-sm'
                      : 'bg-cream-100 dark:bg-dark-700 text-dark-800/60 dark:text-white/50 border-cream-200 dark:border-white/10 hover:border-brand-400/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-dark-800/50 dark:text-white/40 hover:text-dark-800/80 dark:hover:text-white/70 font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Review →
            </button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="bg-cream-50 dark:bg-dark-700/50 border border-cream-200 dark:border-white/8 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-dark-800/45 dark:text-white/30 mb-3">Your store details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <span className="text-dark-800/50 dark:text-white/40 text-xs">Store Name</span>
              <span className="font-semibold text-dark-800 dark:text-white text-xs">{name}</span>

              <span className="text-dark-800/50 dark:text-white/40 text-xs">URL</span>
              <span className="font-mono text-brand-400 text-xs truncate">/s/{slug}</span>

              {tagline && <>
                <span className="text-dark-800/50 dark:text-white/40 text-xs">Tagline</span>
                <span className="text-dark-800 dark:text-white text-xs italic truncate">"{tagline}"</span>
              </>}

              <span className="text-dark-800/50 dark:text-white/40 text-xs">WhatsApp</span>
              <span className="text-dark-800 dark:text-white text-xs">+{whatsapp.replace(/\D/g, '')}</span>

              <span className="text-dark-800/50 dark:text-white/40 text-xs">Currency</span>
              <span className="font-bold text-dark-800 dark:text-white text-xs">{currency}</span>
            </div>
          </div>

          <p className="text-xs text-dark-800/40 dark:text-white/30">
            You can update all of these from your Admin Dashboard → Settings at any time.
          </p>

          <div className="flex justify-between pt-1">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-dark-800/50 dark:text-white/40 hover:text-dark-800/80 dark:hover:text-white/70 font-semibold transition-colors"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Launching...
                </>
              ) : (
                '🚀 Launch Store'
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
