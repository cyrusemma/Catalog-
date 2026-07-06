import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

// Scrolls to the top of the page on every route change.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  return null
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import { syncOfflineOrders } from './lib/offlineOrders'

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
import { useSignInStore } from './store/signInStore'

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

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const signInOpen = useSignInStore(s => s.open)
  const closeSignIn = useSignInStore(s => s.closeModal)
  const signInReason = useSignInStore(s => s.reason)
  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      <AnnouncementBanner />
      <Navbar />
      <div className="pt-20 flex flex-col flex-1">
        {children}
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

/**
 * MerchantStorefrontLayout — completely isolated tenant surface.
 *
 * Uses StoreNavbar + StoreBottomNav + StoreFooter instead of the platform
 * equivalents. Nothing here links to /shop or / except the one deliberate
 * "Browse Marketplace" escape hatch in StoreFooter.
 *
 * The StoreContext.Provider lives inside StoreFront.tsx (so it has access to
 * the fetched store data). This layout just provides the chrome.
 */
function MerchantStorefrontLayout({ children }: { children: React.ReactNode }) {
  const signInOpen = useSignInStore(s => s.open)
  const closeSignIn = useSignInStore(s => s.closeModal)
  const signInReason = useSignInStore(s => s.reason)
  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      <StoreNavbar />
      <div className="pt-20 flex flex-col flex-1">
        {children}
      </div>
      <StoreFooter />
      <StoreBottomNav />
      <SignInModal open={signInOpen} onClose={closeSignIn} reason={signInReason ?? undefined} />
      <ToastContainer />
    </div>
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
      {/* Merchant storefronts — fully isolated tenant surface, no global nav */}
      <Route path="/s/:storeSlug" element={<MerchantStorefrontLayout><StoreFront /></MerchantStorefrontLayout>} />
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
      <Route path="/admin/approvals" element={<AdminProtectedRoute><AdminApprovals /></AdminProtectedRoute>} />
      <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
      <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
      <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
      <Route path="/admin/subscribers" element={<AdminProtectedRoute><AdminSubscribers /></AdminProtectedRoute>} />

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
        <ScrollToTopButton />
        <Suspense
          fallback={<ShopLoader />}
        >
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
