import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useParams } from 'react-router-dom'

// Scrolls to the top of the page on every route change.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { syncOfflineOrders } from './lib/offlineOrders'
import { motion, AnimatePresence } from 'framer-motion'
import { StoreContext } from './contexts/StoreContext'
import type { StoreContextValue } from './contexts/StoreContext'
import { useDynamicPWA } from './hooks/useDynamicPWA'
import { Store } from 'lucide-react'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BottomNav from './components/layout/BottomNav'
import AnnouncementBanner from './components/layout/AnnouncementBanner'
import StoreNavbar from './components/store/StoreNavbar'
import StoreBottomNav from './components/store/StoreBottomNav'
import StoreFooter from './components/store/StoreFooter'
import ShopLoader from './components/ui/ShopLoader'
import OfflineIndicator from './components/ui/OfflineIndicator'
import SignInModal from './components/ui/SignInModal'
import ToastContainer from './components/ui/ToastContainer'
import ScrollToTopButton from './components/ui/ScrollToTop'
import { Toaster } from 'sonner'
import PWAInstallPrompt from './components/ui/PWAInstallPrompt'
import AppReviewPrompt, { trackSession } from './components/ui/AppReviewPrompt'
import NewArrivalsListener from './components/ui/NewArrivalsListener'
import CartSync from './components/ui/CartSync'
import WishlistSync from './components/ui/WishlistSync'
import { useSignInStore } from './store/signInStore'
import { useCustomerSession } from './hooks/useCustomerSession'
import { applyTheme, initialColor, useThemeStore, type ColorTheme } from './store/themeStore'
import PushPromptModal from './components/ui/PushPromptModal'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Gallery = lazy(() => import('./pages/Gallery'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Account = lazy(() => import('./pages/Account'))
const CustomerOrders = lazy(() => import('./pages/CustomerOrders'))
const Settings = lazy(() => import('./pages/Settings'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const StoreFront = lazy(() => import('./pages/store/StoreFront'))
const BecomeMerchant = lazy(() => import('./pages/BecomeMerchant'))
import OfflineGame from './pages/OfflineGame'
const MerchantDashboard = lazy(() => import('./pages/merchant/MerchantDashboard'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'))
const AdminSubscribers = lazy(() => import('./pages/admin/AdminSubscribers'))
const AdminDiscounts = lazy(() => import('./pages/admin/AdminDiscounts'))

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } } })

// ─── Route Guards ────────────────────────────────────────────────────────────

/** Shared helper: checks if the current user owns a store */
async function checkUserStore(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle()
    return !!data && !error
  } catch {
    return false
  }
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [hasStore, setHasStore] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    const checkAccess = async (currentSession: Session | null) => {
      if (!mounted) return
      setSession(currentSession)

      if (!currentSession?.user) {
        setHasStore(false)
        setLoading(false)
        return
      }

      const isAdmin = currentSession.user.app_metadata?.role === 'admin'
      if (isAdmin) {
        setHasStore(true)
        setLoading(false)
        return
      }

      const has = await checkUserStore(currentSession.user.id)
      if (mounted) setHasStore(has)
      if (mounted) setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => checkAccess(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => checkAccess(s))
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (loading) return <ShopLoader />
  if (!session) return <Navigate to="/admin/login" replace />

  const isAdmin = session.user.app_metadata?.role === 'admin'
  if (!isAdmin && !hasStore) {
    return <Navigate to="/admin/login" replace state={{ error: 'unauthorized' }} />
  }

  return <>{children}</>
}

/** Guards /merchant routes — user must own a store (doesn't need to be platform admin) */
function MerchantProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [hasStore, setHasStore] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    const checkAccess = async (currentSession: Session | null) => {
      if (!mounted) return
      setSession(currentSession)

      if (!currentSession?.user) {
        setLoading(false)
        return
      }

      const has = await checkUserStore(currentSession.user.id)
      if (mounted) setHasStore(has)
      if (mounted) setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => checkAccess(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => checkAccess(s))
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (loading) return <ShopLoader />
  if (!session) return <Navigate to="/" replace />
  if (!hasStore) return <Navigate to="/sell" replace />

  return <>{children}</>
}

/** Guards admin-only routes — user must be logged in and have app_metadata.role === 'admin' */
function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    const checkAccess = (currentSession: Session | null) => {
      if (!mounted) return
      setSession(currentSession)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => checkAccess(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => checkAccess(s))
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (loading) return <ShopLoader />
  if (!session) return <Navigate to="/admin/login" replace />

  const isAdmin = session.user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    return <Navigate to="/merchant" replace />
  }

  return <>{children}</>
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const signInOpen = useSignInStore(s => s.open)
  const closeSignIn = useSignInStore(s => s.closeModal)
  const signInReason = useSignInStore(s => s.reason)
  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      <AnnouncementBanner />
      <Navbar />
      <div className="pt-20 flex flex-col flex-1 relative overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col flex-1 w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
      <BottomNav />
      <SignInModal open={signInOpen} onClose={closeSignIn} reason={signInReason ?? undefined} />
      <OfflineIndicator />
      <ToastContainer />
      <PWAInstallPrompt />
      {/* Smart app review prompt — only on platform layer, never on merchant storefronts */}
      <AppReviewPrompt />
    </div>
  )
}

interface StoreDetails {
  id: string
  name: string
  slug: string
  logo_url: string | null
  hero_images: string[]
  tagline: string | null
  social_instagram: string | null
  social_tiktok: string | null
  social_facebook: string | null
  whatsapp_number: string | null
  owner_id: string | null
  settings: Record<string, any>
  minimum_order_amount?: number
  maintenance_mode?: boolean
  maintenance_message?: string | null
  operating_hours?: string | null
  theme_color?: string
}

/**
 * MerchantStorefrontLayout — completely isolated tenant surface.
 *
 * Uses StoreNavbar + StoreBottomNav + StoreFooter instead of the platform
 * equivalents. Nothing here links to /shop or / except the one deliberate
 * "Browse Marketplace" escape hatch in StoreFooter.
 *
 * Now wraps everything in the StoreContext.Provider, carrying the store context
 * across all merchant subpaths (/s/:storeSlug, /s/:storeSlug/product/:id, /s/:storeSlug/cart, etc.).
 */
function MerchantStorefrontLayout({ children }: { children: React.ReactNode }) {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const signInOpen = useSignInStore(s => s.open)
  const closeSignIn = useSignInStore(s => s.closeModal)
  const signInReason = useSignInStore(s => s.reason)

  const { data: store, isLoading, isError } = useQuery<StoreDetails>({
    queryKey: ['store', storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!storeSlug,
  })

  // Dynamically overwrite PWA manifest for THIS merchant storefront
  useDynamicPWA(
    store
      ? {
          name: store.name,
          shortName: store.name,
          startUrl: `/s/${store.slug}`,
          iconUrl: store.logo_url || undefined,
        }
      : null
  )

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Opening storefront...</p>
        </div>
      </div>
    )
  }

  if (isError || !store) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Store Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            The storefront URL you are trying to reach doesn't exist or has been deactivated.
          </p>
          <Link
            to="/"
            className="inline-block bg-brand-400 hover:bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            Go to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const { user } = useCustomerSession()
  const isOwner = !!user?.id && user.id === store.owner_id

  const ctxValue: StoreContextValue = {
    storeSlug: store.slug,
    storeId: store.id,
    storeName: store.name,
    logoUrl: store.logo_url,
    tagline: store.tagline,
    socialInstagram: store.social_instagram,
    socialTiktok: store.social_tiktok,
    socialFacebook: store.social_facebook,
    whatsappNumber: store.whatsapp_number,
    ownerId: store.owner_id,
    heroImages: store.hero_images || [],
    settings: store.settings || {},
    minimumOrderAmount: Number(store.minimum_order_amount) || 0,
    maintenanceMode: !!store.maintenance_mode,
    maintenanceMessage: store.maintenance_message || null,
    operatingHours: store.operating_hours || null,
  }

  const location = useLocation()

  const mode = useThemeStore(s => s.mode)
  const merchantThemeColor = (store?.theme_color as ColorTheme) || 'golden'

  useEffect(() => {
    if (store?.theme_color) {
      applyTheme(merchantThemeColor, mode)
    }
    return () => {
      applyTheme(initialColor(), mode)
    }
  }, [merchantThemeColor, mode])

  if (store.maintenance_mode && !isOwner) {
    return (
      <StoreContext.Provider value={ctxValue}>
        <div className="flex flex-col min-h-dvh bg-gradient-to-br from-[#100609] via-[#0f0a05] to-[#000] text-white overflow-hidden relative font-sans">
          {/* Decorative glowing ambient backdrops */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-brand-400/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-brand-400/5 blur-[120px] pointer-events-none" />
          
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
            <div className="max-w-md w-full text-center space-y-8 glass border border-brand-400/10 p-8 sm:p-10 rounded-3xl shadow-2xl backdrop-blur-md">
              {/* Logo / Icon */}
              <div className="flex justify-center">
                {store.logo_url ? (
                  <div className="relative group">
                    <img 
                      src={store.logo_url} 
                      alt={store.name} 
                      className="w-24 h-24 rounded-3xl object-cover border-2 border-brand-400/20 shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 rounded-3xl bg-brand-400/10 animate-pulse pointer-events-none" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-3xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400">
                    <Store size={38} />
                  </div>
                )}
              </div>

              {/* Title & Badge */}
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-brand-400/10 text-brand-400 border border-brand-400/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-ping" />
                  Under Maintenance
                </span>
                <h1 className="text-3xl font-display font-bold tracking-tight text-white">
                  {store.name}
                </h1>
                {store.tagline && (
                  <p className="text-white/40 text-xs tracking-wide">
                    {store.tagline}
                  </p>
                )}
              </div>

              {/* Message */}
              <div className="py-4 px-5 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
                <p className="text-white/70 text-sm leading-relaxed font-light">
                  {store.maintenance_message || "We're currently polishing our storefront to serve you better. Please check back soon!"}
                </p>
              </div>

              {/* Actions & Escapes */}
              <div className="space-y-4 pt-2">
                {store.whatsapp_number && (
                  <a
                    href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full justify-center py-3.5 text-sm flex items-center gap-2 rounded-xl"
                  >
                    Contact Vendor on WhatsApp
                  </a>
                )}
                <Link
                  to="/"
                  className="btn-ghost w-full justify-center py-3 text-xs text-white/50 hover:text-white flex items-center gap-1.5 rounded-xl border border-white/5 hover:border-white/10 transition-all"
                >
                  Return to Marketplace
                </Link>
              </div>
            </div>
          </div>
          
          {/* Minimal footer */}
          <div className="py-6 text-center text-[10px] text-white/20 border-t border-white/[0.03] relative z-10">
            &copy; {new Date().getFullYear()} {store.name}. Powered by Catalog.
          </div>
        </div>
      </StoreContext.Provider>
    )
  }

  return (
    <StoreContext.Provider value={ctxValue}>
      <div className="flex flex-col min-h-dvh overflow-x-hidden">
        <StoreNavbar />
        <div className="pt-20 flex flex-col flex-1 relative overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col flex-1 w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <StoreFooter />
        <StoreBottomNav />
        <SignInModal open={signInOpen} onClose={closeSignIn} reason={signInReason ?? undefined} />
        <ToastContainer />
      </div>
    </StoreContext.Provider>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <>
      <ScrollToTop />
      <Routes location={location}>
        {/* Storefront */}
        <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
        <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/shop/:parentSlug" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/shop/:parentSlug/:subSlug" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/gallery" element={<StorefrontLayout><Gallery /></StorefrontLayout>} />
        <Route path="/product/:id" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
        <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
        <Route path="/wishlist" element={<StorefrontLayout><Wishlist /></StorefrontLayout>} />
        <Route path="/account" element={<StorefrontLayout><Account /></StorefrontLayout>} />
        <Route path="/account/orders" element={<StorefrontLayout><CustomerOrders /></StorefrontLayout>} />
        <Route path="/settings" element={<StorefrontLayout><Settings /></StorefrontLayout>} />
        <Route path="/privacy" element={<StorefrontLayout><Privacy /></StorefrontLayout>} />
        <Route path="/terms" element={<StorefrontLayout><Terms /></StorefrontLayout>} />
        <Route path="/reset-password" element={<StorefrontLayout><ResetPassword /></StorefrontLayout>} />
        {/* Merchant storefronts — fully isolated tenant surface, no global nav */}
        <Route path="/s/:storeSlug" element={<MerchantStorefrontLayout><StoreFront /></MerchantStorefrontLayout>} />
        <Route path="/s/:storeSlug/product/:id" element={<MerchantStorefrontLayout><ProductDetail /></MerchantStorefrontLayout>} />
        <Route path="/s/:storeSlug/cart" element={<MerchantStorefrontLayout><Cart /></MerchantStorefrontLayout>} />
        <Route path="/s/:storeSlug/wishlist" element={<MerchantStorefrontLayout><Wishlist /></MerchantStorefrontLayout>} />
        <Route path="/sell" element={<StorefrontLayout><BecomeMerchant /></StorefrontLayout>} />
        <Route path="/offline-game" element={<OfflineGame />} />

        {/* Merchant dashboard — scoped to store owner, not platform admin */}
        <Route path="/merchant" element={<MerchantProtectedRoute><MerchantDashboard /></MerchantProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
        <Route path="/admin/products/new" element={<AdminProtectedRoute><AdminProductForm /></AdminProtectedRoute>} />
        <Route path="/admin/products/:id/edit" element={<AdminProtectedRoute><AdminProductForm /></AdminProtectedRoute>} />
        <Route path="/admin/approvals" element={<AdminOnlyRoute><AdminApprovals /></AdminOnlyRoute>} />
        <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
        <Route path="/admin/discounts" element={<AdminProtectedRoute><AdminDiscounts /></AdminProtectedRoute>} />
        <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
        <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
        <Route path="/admin/subscribers" element={<AdminOnlyRoute><AdminSubscribers /></AdminOnlyRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  useEffect(() => {
    // Only run on the browser side (avoid double tracking in strict mode if possible, but fine for now)
    trackSession()

    let mounted = true
    let removeChannel: (() => void) | undefined

    const timer = window.setTimeout(() => {
      if (!mounted) return
      const channel = supabase
        .channel('store-settings-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'store_settings' },
          () => qc.invalidateQueries({ queryKey: ['store-settings'] })
        )
        .subscribe()
      removeChannel = () => {
        supabase.removeChannel(channel)
      }
    }, 3000)

    return () => {
      mounted = false
      window.clearTimeout(timer)
      removeChannel?.()
    }
  }, [])

  // Anonymous visit tracking hook
  useEffect(() => {
    const logVisit = async () => {
      try {
        const isLogged = sessionStorage.getItem('logged_visit')
        if (isLogged) return

        let sessionId = sessionStorage.getItem('tab_session_id')
        if (!sessionId) {
          sessionId = crypto.randomUUID()
          sessionStorage.setItem('tab_session_id', sessionId)
        }

        const { error } = await supabase.from('visits').insert({
          session_id: sessionId
        })
        if (!error) {
          sessionStorage.setItem('logged_visit', 'true')
        }
      } catch (err) {
        console.error('Error logging visit:', err)
      }
    }
    logVisit()
  }, [])

  // Offline orders sync listener
  useEffect(() => {
    syncOfflineOrders()
    const handleOnline = () => syncOfflineOrders()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const [toasterPosition, setToasterPosition] = useState<'top-center' | 'top-right'>('top-center')

  useEffect(() => {
    const updatePosition = () => {
      setToasterPosition(window.innerWidth >= 768 ? 'top-right' : 'top-center')
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  return (
    <QueryClientProvider client={qc}>
      <Toaster position={toasterPosition} richColors />
      <BrowserRouter>
        <NewArrivalsListener />
        <CartSync />
        <WishlistSync />
        <ScrollToTopButton />
        <Suspense
          fallback={<ShopLoader />}
        >
          <AnimatedRoutes />
        </Suspense>
        <PushPromptModal />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
