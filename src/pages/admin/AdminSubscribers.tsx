import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Send, 
  Calendar, 
  ShoppingBag, 
  UserCheck, 
  TrendingUp,
  AlertCircle,
  Phone,
  Mail,
  ShoppingBag as CartIcon,
  Bell,
  MessageCircle,
  X,
  Radio
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase, supabaseUrl } from '../../lib/supabase'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'

// Helper to determine device icon from user agent string
function getDeviceIcon(ua: string | null) {
  if (!ua) return Smartphone
  const lower = ua.toLowerCase()
  if (lower.includes('ipad') || lower.includes('tablet')) return Tablet
  if (lower.includes('macintosh') || lower.includes('windows') || lower.includes('linux')) return Monitor
  return Smartphone
}

// Helper to parse clean device / browser name
function getBrowserName(ua: string | null) {
  if (!ua) return 'Web Browser'
  const lower = ua.toLowerCase()
  if (lower.includes('iphone')) return 'iPhone (Safari)'
  if (lower.includes('ipad')) return 'iPad'
  if (lower.includes('android')) return 'Android Device'
  if (lower.includes('macintosh')) return 'Mac'
  if (lower.includes('windows')) return 'Windows PC'
  if (lower.includes('firefox')) return 'Firefox'
  if (lower.includes('chrome')) return 'Chrome'
  if (lower.includes('safari')) return 'Safari'
  if (lower.includes('edge')) return 'Edge'
  return 'Mobile Browser'
}

export default function AdminSubscribers() {
  const qc = useQueryClient()
  const formatPrice = useCurrencyFormatter()

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchInput])

  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all')
  const [cartFilter, setCartFilter] = useState<'all' | 'has_items'>('all')
  const [deletionFilter, setDeletionFilter] = useState<'all' | 'pending_deletion'>('all')
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Broadcast Modal state
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [broadcastBody, setBroadcastBody] = useState('')
  const [broadcastUrl, setBroadcastUrl] = useState('/')
  const [broadcasting, setBroadcasting] = useState(false)

  // Individual push state
  const [pushTitles, setPushTitles] = useState<Record<string, string>>({})
  const [pushBodies, setPushBodies] = useState<Record<string, string>>({})
  const [sendingPushId, setSendingPushId] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<Record<string, { kind: 'ok' | 'err'; text: string } | null>>({})

  const handleAdminRestoreUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to cancel the deletion request and restore this user's account?")) {
      return
    }
    setActionInProgress(userId)
    try {
      const { error } = await supabase.rpc('restore_user_by_admin', { target_user_id: userId })
      if (error) throw error
      toast.success("User account restored successfully.")
      qc.invalidateQueries({ queryKey: ['admin-profiles'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore user.")
    } finally {
      setActionInProgress(null)
    }
  }

  const handleAdminDeleteUser = async (userId: string) => {
    if (!window.confirm("WARNING: This will permanently delete this user, their profile, their store, and all associated products/orders. THIS ACTION CANNOT BE UNDONE.\n\nAre you sure you want to proceed?")) {
      return
    }
    setActionInProgress(userId)
    try {
      const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId })
      if (error) throw error
      toast.success("User account deleted permanently.")
      qc.invalidateQueries({ queryKey: ['admin-profiles'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to hard-delete user.")
    } finally {
      setActionInProgress(null)
    }
  }

  // Handle individual push notification
  const handleSendPushNotification = async (userId: string) => {
    const title = pushTitles[userId]?.trim()
    const body = pushBodies[userId]?.trim()
    if (!title || !body) return

    setSendingPushId(userId)
    setPushStatus(prev => ({ ...prev, [userId]: null }))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setPushStatus(prev => ({ 
          ...prev, 
          [userId]: { kind: 'err', text: 'You must be logged in as admin.' } 
        }))
        return
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/notify-new-arrival`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          body,
          click_url: '/'
        }),
      })

      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPushStatus(prev => ({ 
          ...prev, 
          [userId]: { kind: 'err', text: result.error || `Failed with status ${res.status}` } 
        }))
        return
      }

      const sentCount = result.sent ?? 0
      setPushStatus(prev => ({ 
        ...prev, 
        [userId]: { kind: 'ok', text: `Notification sent successfully to ${sentCount} device(s)!` } 
      }))
      
      setPushTitles(prev => ({ ...prev, [userId]: '' }))
      setPushBodies(prev => ({ ...prev, [userId]: '' }))
    } catch (err) {
      setPushStatus(prev => ({ 
        ...prev, 
        [userId]: { kind: 'err', text: err instanceof Error ? err.message : 'Error sending notification.' } 
      }))
    } finally {
      setSendingPushId(null)
    }
  }

  // Handle broadcast push notification to all subscribers
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Please enter both title and message.')
      return
    }

    setBroadcasting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        toast.error('Admin session required.')
        return
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/notify-new-arrival`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          click_url: broadcastUrl.trim() || '/'
        }),
      })

      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'Failed to send broadcast.')
        return
      }

      const sentCount = result.sent ?? 0
      toast.success(`🎉 Broadcast delivered to ${sentCount} subscriber device(s)!`)
      setBroadcastOpen(false)
      setBroadcastTitle('')
      setBroadcastBody('')
      setBroadcastUrl('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send broadcast.')
    } finally {
      setBroadcasting(false)
    }
  }

  // Fetch registered customer profiles
  const { data: profiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // Fetch all orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['admin-subscribers-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_id, customer_name, customer_phone, status, total, created_at, items')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    }
  })

  // Fetch push notification subscriptions
  const { data: pushSubs } = useQuery({
    queryKey: ['admin-subscribers-push-subs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id, user_id, user_agent, created_at')
        if (error) return []
        return data || []
      } catch {
        return []
      }
    },
    initialData: []
  })

  const isLoading = isLoadingProfiles || isLoadingOrders

  // Enrich subscriber profile data
  const enrichedSubscribers = useMemo(() => {
    return (profiles || []).map(profile => {
      const userOrders = (orders || []).filter(o => o.customer_id === profile.id)
      const userPushSubs = (pushSubs || []).filter(s => s.user_id === profile.id)
      
      const latestOrderWithPhone = userOrders.find(o => o.customer_phone)
      const phone = profile.phone || (latestOrderWithPhone ? latestOrderWithPhone.customer_phone : '')

      const cartItems = Array.isArray(profile.cart) ? profile.cart : []
      const cartTotal = cartItems.reduce((acc: number, item: any) => {
        const price = item.product?.selling_price || 0
        return acc + (price * (item.quantity || 1))
      }, 0)

      const totalSpent = userOrders
        .filter(o => o.status !== 'cancelled')
        .reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0)

      return {
        ...profile,
        orders: userOrders,
        pushSubscriptions: userPushSubs,
        phone,
        cartItems,
        cartTotal,
        totalSpent
      }
    })
  }, [profiles, orders, pushSubs])

  // Filter subscribers
  const filteredSubscribers = useMemo(() => {
    return enrichedSubscribers.filter(user => {
      const matchesSearch = 
        !searchQuery ||
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)

      const matchesSub = 
        subscriptionFilter === 'all' ||
        (subscriptionFilter === 'subscribed' && user.notify_new_arrivals) ||
        (subscriptionFilter === 'unsubscribed' && !user.notify_new_arrivals)

      const matchesCart = 
        cartFilter === 'all' ||
        (cartFilter === 'has_items' && user.cartItems.length > 0)

      const matchesDeletion = 
        deletionFilter === 'all' ||
        (deletionFilter === 'pending_deletion' && user.deletion_requested_at)

      return matchesSearch && matchesSub && matchesCart && matchesDeletion
    })
  }, [enrichedSubscribers, searchQuery, subscriptionFilter, cartFilter, deletionFilter])

  const [page, setPage] = useState(0)
  const pageSize = 12

  useEffect(() => {
    setPage(0)
  }, [searchQuery, subscriptionFilter, cartFilter, deletionFilter])

  const paginatedSubscribers = useMemo(() => {
    const from = page * pageSize
    const to = from + pageSize
    return filteredSubscribers.slice(from, to)
  }, [filteredSubscribers, page])

  const totalPages = Math.ceil(filteredSubscribers.length / pageSize)

  // Statistics
  const totalCustomersCount = enrichedSubscribers.length
  const activeSubscribersCount = enrichedSubscribers.filter(u => u.notify_new_arrivals).length
  const activeCartsCount = enrichedSubscribers.filter(u => u.cartItems.length > 0).length
  const totalSubscribersSales = (orders || []).filter(o => o.status !== 'cancelled').length
  const totalPushDevices = pushSubs.length

  const hasActiveFilters = subscriptionFilter !== 'all' || cartFilter !== 'all' || deletionFilter !== 'all' || searchQuery.length > 0

  const handleResetFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setSubscriptionFilter('all')
    setCartFilter('all')
    setDeletionFilter('all')
  }

  const handleWhatsAppReminder = (user: any) => {
    if (!user.phone) return
    const itemsText = user.cartItems
      .map((item: any) => `• ${item.product?.title || 'Product'} (x${item.quantity || 1})`)
      .join('\n')
    const message = `Hi ${user.display_name || 'there'}! 👋\n\nWe noticed you left some items in your shopping cart:\n\n${itemsText}\n\nWould you like us to secure them and prepare them for delivery? Let us know if you need any assistance completing your order!`
    
    const cleanPhone = user.phone.replace(/\D/g, '')
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* ── Top Header & Broadcast CTA ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-brand-400 text-xs font-bold uppercase tracking-[0.2em]">Audience Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-dark-800 dark:text-white flex items-center gap-3">
              <Users size={28} className="text-brand-400" />
              Customers & Subscribers
            </h1>
            <p className="text-dark-800/50 dark:text-white/40 text-xs sm:text-sm mt-0.5">
              Manage customer accounts, cart recoveries, push subscribers, and broadcast campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setBroadcastOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl shadow-sm shadow-brand-400/25 active:scale-95 transition-all"
            >
              <Radio size={16} className="animate-pulse" />
              <span>Broadcast Push</span>
              <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                {totalPushDevices} devices
              </span>
            </button>
          </div>
        </div>

        {/* ── KPI Metric Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Customers */}
          <div className="bg-white dark:bg-dark-800 rounded-3xl p-4 sm:p-5 border border-cream-200 dark:border-white/10 shadow-sm flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-dark-800/40 dark:text-white/40 text-[11px] font-bold uppercase tracking-wider">Customers</p>
              <h3 className="text-xl sm:text-2xl font-bold text-dark-800 dark:text-white mt-0.5 truncate">{totalCustomersCount}</h3>
            </div>
          </div>

          {/* Active Subscribers */}
          <div className="bg-white dark:bg-dark-800 rounded-3xl p-4 sm:p-5 border border-cream-200 dark:border-white/10 shadow-sm flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <UserCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-dark-800/40 dark:text-white/40 text-[11px] font-bold uppercase tracking-wider">Subscribers</p>
              <h3 className="text-xl sm:text-2xl font-bold text-dark-800 dark:text-white mt-0.5 truncate flex items-center gap-1.5">
                {activeSubscribersCount}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
            </div>
          </div>

          {/* Active Carts */}
          <div className="bg-white dark:bg-dark-800 rounded-3xl p-4 sm:p-5 border border-cream-200 dark:border-white/10 shadow-sm flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <CartIcon size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-dark-800/40 dark:text-white/40 text-[11px] font-bold uppercase tracking-wider">Active Carts</p>
              <h3 className="text-xl sm:text-2xl font-bold text-dark-800 dark:text-white mt-0.5 truncate">{activeCartsCount}</h3>
            </div>
          </div>

          {/* Total Sales */}
          <div className="bg-white dark:bg-dark-800 rounded-3xl p-4 sm:p-5 border border-cream-200 dark:border-white/10 shadow-sm flex items-center gap-3.5 relative overflow-hidden group">
            <div className="w-11 h-11 rounded-2xl bg-brand-400/10 text-brand-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-dark-800/40 dark:text-white/40 text-[11px] font-bold uppercase tracking-wider">Completed Orders</p>
              <h3 className="text-xl sm:text-2xl font-bold text-dark-800 dark:text-white mt-0.5 truncate">{totalSubscribersSales}</h3>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-dark-800 rounded-3xl p-4 sm:p-5 border border-cream-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-800/40 dark:text-white/40" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full bg-cream-100/70 dark:bg-dark-700/60 border border-cream-200 dark:border-white/10 focus:border-brand-400 focus:bg-white dark:focus:bg-dark-700 rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-dark-800 dark:text-white placeholder-dark-800/40 dark:placeholder-white/40 outline-none transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                title="Subscription Filter"
                value={subscriptionFilter}
                onChange={e => setSubscriptionFilter(e.target.value as any)}
                className="bg-cream-100/70 dark:bg-dark-700/60 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-3 py-2 text-xs font-semibold text-dark-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">All Subscriptions</option>
                <option value="subscribed">Subscribed Only</option>
                <option value="unsubscribed">Unsubscribed Only</option>
              </select>

              <select
                title="Cart Status Filter"
                value={cartFilter}
                onChange={e => setCartFilter(e.target.value as any)}
                className="bg-cream-100/70 dark:bg-dark-700/60 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-3 py-2 text-xs font-semibold text-dark-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">All Carts</option>
                <option value="has_items">🛒 Abandoned/Active Carts</option>
              </select>

              <select
                title="Account Status Filter"
                value={deletionFilter}
                onChange={e => setDeletionFilter(e.target.value as any)}
                className="bg-cream-100/70 dark:bg-dark-700/60 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-3 py-2 text-xs font-semibold text-dark-800 dark:text-white outline-none cursor-pointer"
              >
                <option value="all">All Accounts</option>
                <option value="pending_deletion">⚠️ Pending Deletion</option>
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Content: Responsive Card List (Mobile) + Table (Desktop) ─ */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white dark:bg-dark-800 rounded-3xl p-6 border border-cream-200 dark:border-white/10 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cream-100 dark:bg-dark-700" />
                  <div className="space-y-2 flex-1">
                    <div className="w-36 h-4 bg-cream-100 dark:bg-dark-700 rounded" />
                    <div className="w-48 h-3 bg-cream-100 dark:bg-dark-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-white/10 py-16 px-4 text-center shadow-sm">
            <Users size={48} className="text-dark-800/20 dark:text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-bold text-dark-800 dark:text-white">No customers found</h3>
            <p className="text-xs text-dark-800/50 dark:text-white/40 mt-1 max-w-sm mx-auto">
              No subscriber or customer accounts match your current filter criteria.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-400 text-white text-xs font-bold shadow-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Mobile View: High-Touch Adaptive Cards (< md) ───────────── */}
            <div className="md:hidden space-y-3">
              {paginatedSubscribers.map(user => {
                const isExpanded = expandedUserId === user.id
                return (
                  <div
                    key={user.id}
                    className="bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-white/10 shadow-sm overflow-hidden transition-all"
                  >
                    {/* Main Card Header (Click to expand) */}
                    <div
                      onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      className="p-4 space-y-3 cursor-pointer active:bg-cream-50/50 dark:active:bg-dark-700/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-500 text-white font-bold text-sm flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm shadow-brand-400/20">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                            ) : (
                              user.display_name?.slice(0, 2).toUpperCase() || 'CU'
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-dark-800 dark:text-white truncate">
                              {user.display_name || 'Customer'}
                            </h3>
                            <p className="text-xs text-dark-800/50 dark:text-white/40 truncate flex items-center gap-1 mt-0.5">
                              <Mail size={11} /> {user.email}
                            </p>
                            {user.phone && (
                              <p className="text-[11px] text-dark-800/60 dark:text-white/50 font-mono flex items-center gap-1 mt-0.5">
                                <Phone size={10} /> {user.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {user.notify_new_arrivals ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Subscribed" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-dark-800/20 dark:text-white/20" title="Unsubscribed" />
                          )}
                          <div className="w-7 h-7 rounded-xl bg-cream-100 dark:bg-dark-700 text-dark-800/60 dark:text-white/60 flex items-center justify-center">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>
                      </div>

                      {/* Pill Badges & Quick Stats Strip */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {user.notify_new_arrivals ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Push Subscribed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-cream-200/60 dark:bg-dark-700 text-dark-800/50 dark:text-white/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Unsubscribed
                          </span>
                        )}

                        {user.cartItems.length > 0 && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            <CartIcon size={11} /> {user.cartItems.length} in cart ({formatPrice(user.cartTotal)})
                          </span>
                        )}

                        {user.orders.length > 0 && (
                          <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            {user.orders.length} order{user.orders.length !== 1 ? 's' : ''} ({formatPrice(user.totalSpent)})
                          </span>
                        )}

                        {user.deletion_requested_at && (
                          <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                            <AlertCircle size={10} /> Pending Deletion
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Action Drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-cream-100 dark:border-white/5 bg-cream-50/50 dark:bg-dark-900/40 p-4 space-y-4"
                        >
                          {/* Quick WhatsApp recovery button */}
                          {user.phone && user.cartItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleWhatsAppReminder(user)}
                              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-2xl text-xs shadow-sm transition-all active:scale-95"
                            >
                              <MessageCircle size={14} /> Send WhatsApp Cart Reminder
                            </button>
                          )}

                          {/* Cart items preview */}
                          {user.cartItems.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                                <CartIcon size={12} className="text-amber-500" />
                                Cart Items ({user.cartItems.length})
                              </h4>
                              <div className="space-y-1.5 rounded-2xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 p-3">
                                {user.cartItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1">
                                    <span className="font-medium text-dark-800 dark:text-white truncate max-w-[180px]">
                                      {item.product?.title || 'Product'} × {item.quantity || 1}
                                    </span>
                                    <span className="font-bold text-dark-800 dark:text-white">
                                      {formatPrice((item.product?.selling_price || 0) * (item.quantity || 1))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Push devices & notification form */}
                          <div className="space-y-2">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-1.5">
                              <Bell size={12} className="text-brand-400" />
                              Push Notifications ({user.pushSubscriptions.length} device{user.pushSubscriptions.length !== 1 ? 's' : ''})
                            </h4>

                            {user.pushSubscriptions.length > 0 ? (
                              <div className="rounded-2xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 p-3 space-y-2.5">
                                <input
                                  type="text"
                                  placeholder="Title (e.g. Special Discount for you!)"
                                  value={pushTitles[user.id] || ''}
                                  onChange={e => setPushTitles(prev => ({ ...prev, [user.id]: e.target.value }))}
                                  className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-800 dark:text-white outline-none"
                                />
                                <textarea
                                  placeholder="Message..."
                                  rows={2}
                                  value={pushBodies[user.id] || ''}
                                  onChange={e => setPushBodies(prev => ({ ...prev, [user.id]: e.target.value }))}
                                  className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-800 dark:text-white outline-none resize-none"
                                />
                                {pushStatus[user.id] && (
                                  <p className={`text-[10px] p-2 rounded-lg font-semibold ${
                                    pushStatus[user.id]?.kind === 'ok' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {pushStatus[user.id]?.text}
                                  </p>
                                )}
                                <button
                                  type="button"
                                  disabled={sendingPushId === user.id || !pushTitles[user.id]?.trim() || !pushBodies[user.id]?.trim()}
                                  onClick={() => handleSendPushNotification(user.id)}
                                  className="w-full bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                                >
                                  {sendingPushId === user.id ? 'Sending...' : 'Send Direct Push'}
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-dark-800/40 dark:text-white/40 italic">
                                No browser push devices registered yet.
                              </p>
                            )}
                          </div>

                          {/* Account deletion options */}
                          {user.deletion_requested_at && (
                            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 space-y-2">
                              <p className="text-xs font-bold text-red-500">Account Deletion Requested</p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAdminRestoreUser(user.id)}
                                  disabled={actionInProgress === user.id}
                                  className="flex-1 py-2 rounded-xl bg-white dark:bg-dark-800 text-xs font-bold text-dark-800 dark:text-white border border-cream-200 dark:border-white/10"
                                >
                                  Restore User
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminDeleteUser(user.id)}
                                  disabled={actionInProgress === user.id}
                                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-sm"
                                >
                                  Hard Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop View: Spacious Rich Table (>= md) ───────────────── */}
            <div className="hidden md:block bg-white dark:bg-dark-800 rounded-3xl border border-cream-200 dark:border-white/10 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-cream-100 dark:border-white/5 bg-cream-50/50 dark:bg-dark-900/30 text-[11px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40">
                    <th className="py-4 px-6">Customer Profile</th>
                    <th className="py-4 px-6">Subscription</th>
                    <th className="py-4 px-6">Active Cart</th>
                    <th className="py-4 px-6">Orders & Spent</th>
                    <th className="py-4 px-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100 dark:divide-white/5">
                  {paginatedSubscribers.map(user => {
                    const isExpanded = expandedUserId === user.id
                    return (
                      <>
                        <tr 
                          key={user.id} 
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className={`hover:bg-cream-50/60 dark:hover:bg-dark-700/30 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-cream-50/40 dark:bg-dark-700/20' : ''
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-500 text-white font-bold text-sm flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm shadow-brand-400/20">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                                ) : (
                                  user.display_name?.slice(0, 2).toUpperCase() || 'CU'
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm text-dark-800 dark:text-white truncate">{user.display_name || 'Customer'}</p>
                                  {user.deletion_requested_at && (
                                    <span className="inline-flex bg-red-500/10 text-red-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse flex-shrink-0">
                                      Pending Deletion
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-dark-800/40 dark:text-white/40 truncate flex items-center gap-1.5 mt-0.5">
                                  <Mail size={12} /> {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            {user.notify_new_arrivals ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Subscribed ({user.pushSubscriptions.length})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-cream-200/60 dark:bg-dark-700 text-dark-800/50 dark:text-white/40 text-xs font-bold px-2.5 py-1 rounded-full">
                                Unsubscribed
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            {user.cartItems.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/20 rounded-xl px-2.5 py-1">
                                <CartIcon size={13} /> {user.cartItems.length} items ({formatPrice(user.cartTotal)})
                              </span>
                            ) : (
                              <span className="text-dark-800/30 dark:text-white/30 text-xs">—</span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="text-xs font-bold text-dark-800 dark:text-white">
                              {user.orders.length} order{user.orders.length !== 1 ? 's' : ''}
                            </div>
                            {user.orders.length > 0 && (
                              <div className="text-[11px] text-dark-800/50 dark:text-white/40 mt-0.5 font-medium">
                                Total: {formatPrice(user.totalSpent)}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-xl bg-cream-100 dark:bg-dark-700 text-dark-800/60 dark:text-white/60 hover:text-dark-800 dark:hover:text-white inline-flex items-center justify-center transition-colors"
                              aria-label="Expand details"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-cream-50/40 dark:bg-dark-900/30">
                            <td colSpan={5} className="py-6 px-6 border-b border-cream-100 dark:border-white/5">
                              {/* Deletion Warning if any */}
                              {user.deletion_requested_at && (
                                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                    <h4 className="text-red-500 font-bold text-sm flex items-center gap-1.5">
                                      <AlertCircle size={16} /> Account Deletion Requested
                                    </h4>
                                    <p className="text-dark-800/70 dark:text-white/70 text-xs mt-1">
                                      Requested on {new Date(user.deletion_requested_at).toLocaleDateString()} {new Date(user.deletion_requested_at).toLocaleTimeString()}.
                                    </p>
                                  </div>
                                  <div className="flex gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAdminRestoreUser(user.id)}
                                      disabled={actionInProgress === user.id}
                                      className="px-4 py-2 rounded-xl bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 text-xs font-bold text-dark-800 dark:text-white"
                                    >
                                      Cancel & Restore User
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAdminDeleteUser(user.id)}
                                      disabled={actionInProgress === user.id}
                                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold shadow-sm"
                                    >
                                      Approve & Delete Permanently
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Cart & WhatsApp Recovery */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-2">
                                    <CartIcon size={14} className="text-amber-500" />
                                    Active Cart Items
                                  </h4>

                                  {user.cartItems.length === 0 ? (
                                    <p className="text-xs text-dark-800/40 dark:text-white/40 italic">
                                      Customer's shopping cart is currently empty.
                                    </p>
                                  ) : (
                                    <div className="border border-cream-200 dark:border-white/10 rounded-2xl bg-white dark:bg-dark-800 p-4 space-y-3 shadow-sm">
                                      <div className="divide-y divide-cream-100 dark:divide-white/5">
                                        {user.cartItems.map((item: any, idx: number) => (
                                          <div key={idx} className="py-2 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-10 h-10 rounded-xl bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {item.product?.images?.[0] ? (
                                                  <img src={item.product.images[0]} alt={item.product.title} className="w-full h-full object-cover" />
                                                ) : (
                                                  <ShoppingBag size={14} className="text-dark-800/40 dark:text-white/40" />
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-xs font-semibold text-dark-800 dark:text-white truncate">{item.product?.title}</p>
                                                <p className="text-[11px] text-dark-800/50 dark:text-white/40 mt-0.5">
                                                  Qty: {item.quantity} × {formatPrice(item.product?.selling_price || 0)}
                                                </p>
                                              </div>
                                            </div>
                                            <span className="text-xs font-bold text-dark-800 dark:text-white">
                                              {formatPrice((item.product?.selling_price || 0) * (item.quantity || 1))}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="pt-3 border-t border-cream-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-dark-800 dark:text-white">
                                        <span>Total Cart Value</span>
                                        <span className="text-amber-500 font-bold">{formatPrice(user.cartTotal)}</span>
                                      </div>

                                      {user.phone ? (
                                        <button
                                          type="button"
                                          onClick={() => handleWhatsAppReminder(user)}
                                          className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
                                        >
                                          <MessageCircle size={14} /> Send WhatsApp Cart Reminder
                                        </button>
                                      ) : (
                                        <p className="text-[11px] text-dark-800/40 dark:text-white/40 italic text-center pt-2">
                                          WhatsApp reminders unavailable (no phone registered).
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Registered Browser Push Devices */}
                                  <div className="pt-2 space-y-2">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-2">
                                      <Smartphone size={14} className="text-emerald-500" />
                                      Push Devices ({user.pushSubscriptions.length})
                                    </h4>
                                    {user.pushSubscriptions.length === 0 ? (
                                      <p className="text-xs text-dark-800/40 dark:text-white/40 italic">
                                        No active browser push endpoints registered.
                                      </p>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {user.pushSubscriptions.map((sub: any, subIdx: number) => {
                                          const Icon = getDeviceIcon(sub.user_agent)
                                          return (
                                            <div key={subIdx} className="bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7 h-7 rounded-lg bg-cream-100 dark:bg-dark-700 flex items-center justify-center text-dark-800/60 dark:text-white/60">
                                                  <Icon size={14} />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="font-semibold text-dark-800 dark:text-white truncate">{getBrowserName(sub.user_agent)}</p>
                                                  <p className="text-dark-800/40 dark:text-white/40 text-[10px] truncate max-w-xs">{sub.user_agent || 'Unknown details'}</p>
                                                </div>
                                              </div>
                                              <span className="text-[10px] text-dark-800/40 dark:text-white/40 flex items-center gap-1">
                                                <Calendar size={10} /> {new Date(sub.created_at).toLocaleDateString()}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right Column: Direct Push Notification Form + Orders */}
                                <div className="space-y-4">
                                  {user.pushSubscriptions.length > 0 && (
                                    <div className="border border-cream-200 dark:border-white/10 rounded-2xl bg-white dark:bg-dark-800 p-4 space-y-3 shadow-sm">
                                      <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/60 dark:text-white/60 flex items-center gap-2">
                                        <Send size={14} className="text-brand-400" />
                                        Send Direct Push Notification
                                      </h4>

                                      <input
                                        type="text"
                                        placeholder="Notification Title (e.g. Exclusive Weekend Discount!)"
                                        value={pushTitles[user.id] || ''}
                                        onChange={e => setPushTitles(prev => ({ ...prev, [user.id]: e.target.value }))}
                                        className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-800 dark:text-white outline-none"
                                      />

                                      <textarea
                                        placeholder="Notification Message..."
                                        rows={2}
                                        value={pushBodies[user.id] || ''}
                                        onChange={e => setPushBodies(prev => ({ ...prev, [user.id]: e.target.value }))}
                                        className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-800 dark:text-white outline-none resize-none"
                                      />

                                      {pushStatus[user.id] && (
                                        <p className={`text-[11px] px-3 py-2 rounded-xl font-semibold ${
                                          pushStatus[user.id]?.kind === 'ok' 
                                            ? 'bg-emerald-500/10 text-emerald-500' 
                                            : 'bg-red-500/10 text-red-500'
                                        }`}>
                                          {pushStatus[user.id]?.text}
                                        </p>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleSendPushNotification(user.id)}
                                        disabled={sendingPushId === user.id || !pushTitles[user.id]?.trim() || !pushBodies[user.id]?.trim()}
                                        className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm"
                                      >
                                        <Send size={12} /> {sendingPushId === user.id ? 'Sending...' : 'Send Push to User'}
                                      </button>
                                    </div>
                                  )}

                                  {/* Past Order History */}
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-dark-800/40 dark:text-white/40 flex items-center gap-2">
                                      <ShoppingBag size={14} className="text-blue-500" />
                                      Recent Orders ({user.orders.length})
                                    </h4>

                                    {user.orders.length === 0 ? (
                                      <p className="text-xs text-dark-800/40 dark:text-white/40 italic">
                                        No order history yet.
                                      </p>
                                    ) : (
                                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                        {user.orders.map((order: any) => (
                                          <div key={order.id} className="bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
                                            <div>
                                              <p className="font-bold text-dark-800 dark:text-white">Order #{order.id.slice(0, 8)}</p>
                                              <p className="text-[10px] text-dark-800/40 dark:text-white/40 mt-0.5">
                                                {new Date(order.created_at).toLocaleDateString()} • {order.items?.length || 0} item(s)
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-bold text-dark-800 dark:text-white">{formatPrice(Number(order.total) || 0)}</p>
                                              <span className={`inline-block text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${
                                                order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                order.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                                                'bg-blue-500/10 text-blue-500'
                                              }`}>
                                                {order.status}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination Bar ─────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-dark-800 border border-cream-200 dark:border-white/10 rounded-2xl shadow-sm">
                <p className="text-xs text-dark-800/50 dark:text-white/40 text-center sm:text-left">
                  Showing <span className="font-bold text-dark-800 dark:text-white">{page * pageSize + 1}</span> to <span className="font-bold text-dark-800 dark:text-white">{Math.min((page + 1) * pageSize, filteredSubscribers.length)}</span> of <span className="font-bold text-dark-800 dark:text-white">{filteredSubscribers.length}</span> customers
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3.5 py-1.5 rounded-xl bg-cream-100 dark:bg-dark-700 hover:bg-cream-200 dark:hover:bg-dark-600 text-dark-800 dark:text-white text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-brand-400 px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3.5 py-1.5 rounded-xl bg-cream-100 dark:bg-dark-700 hover:bg-cream-200 dark:hover:bg-dark-600 text-dark-800 dark:text-white text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Broadcast Push Notification Modal ──────────────────────────── */}
        <AnimatePresence>
          {broadcastOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setBroadcastOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="relative w-full max-w-lg bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/20 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-cream-100 dark:border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-brand-400/10 text-brand-500 flex items-center justify-center">
                      <Radio size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-dark-800 dark:text-white">Broadcast Announcement</h3>
                      <p className="text-xs text-dark-800/50 dark:text-white/40">
                        Deliver instant push alerts to all {totalPushDevices} registered device(s).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="p-2 rounded-xl text-dark-800/40 dark:text-white/40 hover:text-dark-800 dark:hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-800/60 dark:text-white/60 mb-1.5">
                      Notification Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🎉 Weekend Flash Sale — 20% Off Everything!"
                      value={broadcastTitle}
                      onChange={e => setBroadcastTitle(e.target.value)}
                      className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-dark-800 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-800/60 dark:text-white/60 mb-1.5">
                      Message Body *
                    </label>
                    <textarea
                      placeholder="e.g. Discover our latest collection and use promo code FLASH20 at checkout today."
                      rows={3}
                      value={broadcastBody}
                      onChange={e => setBroadcastBody(e.target.value)}
                      className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-dark-800 dark:text-white outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-800/60 dark:text-white/60 mb-1.5">
                      Click URL / Destination
                    </label>
                    <input
                      type="text"
                      placeholder="/shop or /blog"
                      value={broadcastUrl}
                      onChange={e => setBroadcastUrl(e.target.value)}
                      className="w-full bg-cream-50 dark:bg-dark-700 border border-cream-200 dark:border-white/10 focus:border-brand-400 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-dark-800 dark:text-white outline-none"
                    />
                  </div>

                  {/* Live Simulation Preview */}
                  <div className="p-3.5 rounded-2xl bg-cream-100/60 dark:bg-dark-900/60 border border-cream-200 dark:border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-dark-800/40 dark:text-white/40">
                      Live Notification Preview
                    </span>
                    <div className="flex items-start gap-3 p-2.5 bg-white dark:bg-dark-800 rounded-xl border border-cream-200 dark:border-white/5 shadow-sm">
                      <div className="w-8 h-8 rounded-lg bg-brand-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        C
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-dark-800 dark:text-white truncate">
                          {broadcastTitle || 'Notification Title'}
                        </p>
                        <p className="text-[11px] text-dark-800/60 dark:text-white/50 line-clamp-2 mt-0.5">
                          {broadcastBody || 'Notification preview message will appear here on user phones and desktops.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTAs */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-cream-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setBroadcastOpen(false)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-dark-800/60 dark:text-white/60 hover:text-dark-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={broadcasting || !broadcastTitle.trim() || !broadcastBody.trim()}
                    onClick={handleSendBroadcast}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-400 hover:bg-brand-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm shadow-brand-400/25 active:scale-95 transition-all"
                  >
                    <Send size={14} />
                    <span>{broadcasting ? 'Sending Broadcast...' : 'Send Broadcast Now'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
