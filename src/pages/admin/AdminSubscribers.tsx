import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  ShoppingBag as CartIcon
} from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase, supabaseUrl } from '../../lib/supabase'
import { formatPrice } from '../../lib/utils'

// Helper to determine device icon from user agent string
function getDeviceIcon(ua: string | null) {
  if (!ua) return Smartphone
  const lower = ua.toLowerCase()
  if (lower.includes('ipad') || lower.includes('tablet')) return Tablet
  if (lower.includes('macintosh') || lower.includes('windows') || lower.includes('linux')) return Monitor
  return Smartphone
}

// Helper to parse simple browser name
function getBrowserName(ua: string | null) {
  if (!ua) return 'Unknown Device'
  const lower = ua.toLowerCase()
  if (lower.includes('firefox')) return 'Firefox'
  if (lower.includes('chrome') && !lower.includes('chromium')) return 'Chrome'
  if (lower.includes('safari') && !lower.includes('chrome')) return 'Safari'
  if (lower.includes('edge')) return 'Edge'
  if (lower.includes('opera') || lower.includes('opr')) return 'Opera'
  if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS Device'
  if (lower.includes('android')) return 'Android Device'
  return 'Browser'
}

export default function AdminSubscribers() {
  const qc = useQueryClient()
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

  const [pushTitles, setPushTitles] = useState<Record<string, string>>({})
  const [pushBodies, setPushBodies] = useState<Record<string, string>>({})
  const [sendingPushId, setSendingPushId] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<Record<string, { kind: 'ok' | 'err'; text: string } | null>>({})

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
      
      // Clear inputs
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

  // Fetch all orders to map order counts and phone numbers
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

  // Fetch push notification subscriptions (gracefully fallback if RLS or schema doesn't exist)
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
  const enrichedSubscribers = (profiles || []).map(profile => {
    const userOrders = (orders || []).filter(o => o.customer_id === profile.id)
    const userPushSubs = (pushSubs || []).filter(s => s.user_id === profile.id)
    
    // Find phone number from orders (latest first)
    const latestOrderWithPhone = userOrders.find(o => o.customer_phone)
    const phone = latestOrderWithPhone ? latestOrderWithPhone.customer_phone : ''

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

  // Filter subscribers based on search and selected filter values
  const filteredSubscribers = enrichedSubscribers.filter(user => {
    const matchesSearch = 
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

  const [page, setPage] = useState(0)
  const pageSize = 15

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(0)
  }, [searchQuery, subscriptionFilter, cartFilter, deletionFilter])

  const paginatedSubscribers = useMemo(() => {
    const from = page * pageSize
    const to = from + pageSize
    return filteredSubscribers.slice(from, to)
  }, [filteredSubscribers, page])

  const totalPages = Math.ceil(filteredSubscribers.length / pageSize)

  // Statistics summaries
  const totalCustomersCount = enrichedSubscribers.length
  const activeSubscribersCount = enrichedSubscribers.filter(u => u.notify_new_arrivals).length
  const activeCartsCount = enrichedSubscribers.filter(u => u.cartItems.length > 0).length
  const totalSubscribersSales = (orders || []).filter(o => o.status !== 'cancelled').length

  const handleWhatsAppReminder = (user: any) => {
    if (!user.phone) return
    const itemsText = user.cartItems
      .map((item: any) => `• ${item.product.title} (x${item.quantity})`)
      .join('\n')
    const message = `Hi ${user.display_name}! \n\nWe noticed you left some items in your shopping cart:\n\n${itemsText}\n\nWould you like us to secure them and prepare them for delivery? Let us know if you need any assistance completing your order!`
    
    const cleanPhone = user.phone.replace(/\D/g, '')
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Customers</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{totalCustomersCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Subscribers</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{activeSubscribersCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CartIcon size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Carts</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{activeCartsCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Sales</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{totalSubscribersSales}</h3>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              title="Subscription Filter"
              value={subscriptionFilter}
              onChange={e => setSubscriptionFilter(e.target.value as any)}
              className="border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 outline-none cursor-pointer"
            >
              <option value="all">All Subscriptions</option>
              <option value="subscribed">Only Subscribed</option>
              <option value="unsubscribed">Only Unsubscribed</option>
            </select>

            <select
              title="Cart Status Filter"
              value={cartFilter}
              onChange={e => setCartFilter(e.target.value as any)}
              className="border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 outline-none cursor-pointer"
            >
              <option value="all">All Cart States</option>
              <option value="has_items">Has Items in Cart</option>
            </select>

            <select
              title="Deletion Request Filter"
              value={deletionFilter}
              onChange={e => setDeletionFilter(e.target.value as any)}
              className="border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-sm text-gray-700 bg-gray-50 outline-none cursor-pointer"
            >
              <option value="all">All Account States</option>
              <option value="pending_deletion">Pending Deletion</option>
            </select>
          </div>
        </div>

        {/* Subscribers List */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400 font-medium">Loading subscribers...</div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 py-20 text-center shadow-sm">
            <Users size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No customers or subscribers match the filter.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-4 px-6">Customer</th>
                    <th className="py-4 px-6">Subscription</th>
                    <th className="py-4 px-6">Active Cart</th>
                    <th className="py-4 px-6">Orders & Spent</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSubscribers.map(user => {
                    const isExpanded = expandedUserId === user.id
                    return (
                      <>
                        <tr 
                          key={user.id} 
                          className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50/30' : ''}`}
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-400/10 text-brand-600 flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt={user.display_name} className="w-full h-full object-cover" />
                                ) : (
                                  user.display_name?.slice(0, 2).toUpperCase() || 'CU'
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900 truncate">{user.display_name}</p>
                                  {user.deletion_requested_at && (
                                    <span className="inline-flex bg-red-50 text-red-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 animate-pulse flex-shrink-0">
                                      Pending Deletion
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <Mail size={12} /> {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {user.notify_new_arrivals ? (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Subscribed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                                Unsubscribed
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {user.cartItems.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                <CartIcon size={12} /> {user.cartItems.length} items ({formatPrice(user.cartTotal)})
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs font-medium text-gray-900">
                              {user.orders.length} order{user.orders.length !== 1 ? 's' : ''}
                            </div>
                            {user.orders.length > 0 && (
                              <div className="text-[11px] text-gray-400 mt-0.5">
                                Total: {formatPrice(user.totalSpent)}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 text-sm font-semibold p-1"
                              aria-label="Expand details"
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-gray-50/20">
                            <td colSpan={5} className="py-6 px-6 border-b border-gray-100">
                              {/* Deletion Request Admin Action Panel */}
                              {user.deletion_requested_at && (
                                <div className="mb-6 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-500/25 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                    <h4 className="text-red-800 dark:text-red-400 font-bold text-sm flex items-center gap-1.5">
                                      <AlertCircle size={16} /> Account Deletion Requested
                                    </h4>
                                    <p className="text-red-700/80 dark:text-red-400/80 text-xs mt-1">
                                      Requested on {new Date(user.deletion_requested_at).toLocaleDateString()} {new Date(user.deletion_requested_at).toLocaleTimeString()}.
                                      Grace period ends on <span className="font-semibold text-red-600">{new Date(new Date(user.deletion_requested_at).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>.
                                    </p>
                                  </div>
                                  <div className="flex gap-2.5 flex-shrink-0 w-full md:w-auto">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleAdminRestoreUser(user.id); }}
                                      disabled={actionInProgress === user.id}
                                      className="flex-1 md:flex-none text-xs font-bold px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white transition-colors disabled:opacity-50"
                                    >
                                      Cancel & Restore User
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleAdminDeleteUser(user.id); }}
                                      disabled={actionInProgress === user.id}
                                      className="flex-1 md:flex-none text-xs font-bold px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm disabled:opacity-50"
                                    >
                                      Approve & Delete Permanently
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Side: Cart details */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <CartIcon size={14} className="text-amber-500" />
                                    Active Cart Items
                                  </h4>
                                  
                                  {user.cartItems.length === 0 ? (
                                    <p className="text-gray-400 text-sm italic">Customer's shopping cart is currently empty.</p>
                                  ) : (
                                    <div className="border border-gray-100 rounded-2xl bg-white p-4 space-y-3">
                                      <div className="divide-y divide-gray-100">
                                        {user.cartItems.map((item: any, idx: number) => (
                                          <div key={idx} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {item.product?.images?.[0] ? (
                                                  <img src={item.product.images[0]} alt={item.product.title} className="w-full h-full object-cover" />
                                                ) : (
                                                  <ShoppingBag size={14} className="text-gray-400" />
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{item.product?.title}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} × {formatPrice(item.product?.selling_price || 0)}</p>
                                              </div>
                                            </div>
                                            <span className="text-sm font-bold text-gray-900">
                                              {formatPrice((item.product?.selling_price || 0) * (item.quantity || 1))}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      
                                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between font-bold text-gray-900">
                                        <span>Total Cart Value</span>
                                        <span className="text-amber-600">{formatPrice(user.cartTotal)}</span>
                                      </div>

                                      {user.phone ? (
                                        <button
                                          type="button"
                                          onClick={() => handleWhatsAppReminder(user)}
                                          className="w-full mt-4 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
                                        >
                                          <Send size={14} /> Send WhatsApp Cart Reminder
                                        </button>
                                      ) : (
                                        <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">
                                          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                          <p>WhatsApp reminders are unavailable because no phone number was found on past orders for this customer.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Device Endpoint Info */}
                                  <div className="pt-4 space-y-3">
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                      <Smartphone size={14} className="text-green-500" />
                                      Subscribed Devices
                                    </h4>
                                    {user.pushSubscriptions.length === 0 ? (
                                      <p className="text-gray-400 text-sm italic">No active browser push endpoints registered.</p>
                                    ) : (
                                      <>
                                        <div className="space-y-2">
                                          {user.pushSubscriptions.map((sub: any, subIdx: number) => {
                                            const Icon = getDeviceIcon(sub.user_agent)
                                            return (
                                              <div key={subIdx} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2.5">
                                                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                                                    <Icon size={14} />
                                                  </div>
                                                  <div>
                                                    <p className="font-semibold text-gray-900">{getBrowserName(sub.user_agent)}</p>
                                                    <p className="text-gray-400 text-[10px] truncate max-w-[200px] sm:max-w-[300px]">{sub.user_agent || 'Unknown details'}</p>
                                                  </div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                  <Calendar size={10} /> {new Date(sub.created_at).toLocaleDateString()}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>

                                        {/* Send Push Notification Form */}
                                        <div className="mt-4 border border-gray-100 rounded-2xl bg-white p-4 space-y-3 shadow-sm">
                                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Send Push Notification</p>
                                          <div>
                                            <input
                                              type="text"
                                              placeholder="Notification Title (e.g. Exclusive Discount!)"
                                              value={pushTitles[user.id] || ''}
                                              onChange={e => setPushTitles(prev => ({ ...prev, [user.id]: e.target.value }))}
                                              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none bg-gray-50 focus:bg-white transition-colors font-medium"
                                            />
                                          </div>
                                          <div>
                                            <textarea
                                              placeholder="Notification Message..."
                                              rows={2}
                                              value={pushBodies[user.id] || ''}
                                              onChange={e => setPushBodies(prev => ({ ...prev, [user.id]: e.target.value }))}
                                              className="w-full border border-gray-200 focus:border-brand-400 rounded-xl px-3 py-2.5 text-xs text-gray-900 placeholder-gray-400 outline-none bg-gray-50 focus:bg-white transition-colors resize-none font-medium"
                                            />
                                          </div>

                                          {pushStatus[user.id] && (
                                            <p className={`text-[11px] px-3 py-2 rounded-xl border font-semibold ${
                                              pushStatus[user.id]?.kind === 'ok' 
                                                ? 'bg-green-50 border-green-200 text-green-700' 
                                                : 'bg-red-50 border-red-200 text-red-600'
                                            }`}>
                                              {pushStatus[user.id]?.text}
                                            </p>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => handleSendPushNotification(user.id)}
                                            disabled={sendingPushId === user.id || !pushTitles[user.id]?.trim() || !pushBodies[user.id]?.trim()}
                                            className="w-full flex items-center justify-center gap-2 bg-brand-400 hover:bg-brand-500 disabled:opacity-60 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
                                          >
                                            <Send size={12} /> {sendingPushId === user.id ? 'Sending...' : 'Send Push'}
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Right Side: Order history */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <ShoppingBag size={14} className="text-blue-500" />
                                    Order History
                                  </h4>

                                  {user.orders.length === 0 ? (
                                    <p className="text-gray-400 text-sm italic">This customer has not placed any orders yet.</p>
                                  ) : (
                                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                      {user.orders.map((order: any) => (
                                        <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</span>
                                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-200' :
                                                order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-blue-50 text-blue-700 border-blue-200'
                                              }`}>
                                                {order.status}
                                              </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">Placed on {new Date(order.created_at).toLocaleDateString()}</p>
                                            
                                            {order.customer_phone && (
                                              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                                                <Phone size={11} /> {order.customer_phone}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex sm:flex-col sm:items-end justify-between items-center sm:justify-start gap-1">
                                            <span className="font-bold text-gray-900">{formatPrice(Number(order.total) || 0)}</span>
                                            <span className="text-[11px] text-gray-400">
                                              {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50/30 border-t border-gray-100 text-sm select-none">
                <div className="text-gray-500 text-xs">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filteredSubscribers.length)} of {filteredSubscribers.length} subscribers
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <span className="text-gray-600 text-xs font-medium px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
