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

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BottomNav from './components/layout/BottomNav'
import AnnouncementBanner from './components/layout/AnnouncementBanner'
import ShopLoader from './components/ui/ShopLoader'
import OfflineIndicator from './components/ui/OfflineIndicator'
import SignInModal from './components/ui/SignInModal'
import ToastContainer from './components/ui/ToastContainer'
import BackToTop from './components/ui/BackToTop'
import { useSignInStore } from './store/signInStore'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Gallery = lazy(() => import('./pages/Gallery'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Account = lazy(() => import('./pages/Account'))
const Settings = lazy(() => import('./pages/Settings'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'))
const StoreFront = lazy(() => import('./pages/store/StoreFront'))

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } } })

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

      // Check if platform admin
      const isAdmin = currentSession.user.app_metadata?.role === 'admin'
      if (isAdmin) {
        setHasStore(true)
        setLoading(false)
        return
      }

      // Query if this user owns a store
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', currentSession.user.id)
          .maybeSingle()

        if (mounted) {
          setHasStore(!!data && !error)
        }
      } catch {
        if (mounted) setHasStore(false)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      checkAccess(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      checkAccess(s)
    })
    unsubscribe = () => subscription.unsubscribe()

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (loading) {
    return <ShopLoader />
  }

  if (!session) return <Navigate to="/admin/login" replace />

  const isAdmin = session.user.app_metadata?.role === 'admin'
  if (!isAdmin && !hasStore) {
    return <Navigate to="/admin/login" replace state={{ error: 'unauthorized' }} />
  }

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
      <BackToTop />
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
      <Route path="/settings" element={<StorefrontLayout><Settings /></StorefrontLayout>} />
      <Route path="/s/:storeSlug" element={<StorefrontLayout><StoreFront /></StorefrontLayout>} />

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

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default function App() {
  useEffect(() => {
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

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense
          fallback={<ShopLoader />}
        >
          <AnimatedRoutes />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
