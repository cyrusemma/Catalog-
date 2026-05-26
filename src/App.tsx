import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAdminSession } from './lib/admin'
import type { Session } from '@supabase/supabase-js'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BottomNav from './components/layout/BottomNav'
import AnnouncementBanner from './components/layout/AnnouncementBanner'
import ShopLoader from './components/ui/ShopLoader'

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } } })

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | undefined

    import('./lib/supabase').then(({ supabase }) => {
      if (!mounted) return

      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return
        setSession(data.session)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
      unsubscribe = () => subscription.unsubscribe()
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  if (loading) {
    return <ShopLoader />
  }

  if (!session) return <Navigate to="/admin/login" replace />

  if (!isAdminSession(session)) {
    return <Navigate to="/admin/login" replace state={{ error: 'unauthorized' }} />
  }

  return <>{children}</>
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      <AnnouncementBanner />
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
      <Routes location={location}>
        {/* Storefront */}
        <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
        <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/shop/:parentSlug" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/shop/:parentSlug/:subSlug" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
        <Route path="/product/:id" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
        <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
        <Route path="/wishlist" element={<StorefrontLayout><Wishlist /></StorefrontLayout>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/products" element={<AdminProtectedRoute><AdminProducts /></AdminProtectedRoute>} />
        <Route path="/admin/products/new" element={<AdminProtectedRoute><AdminProductForm /></AdminProtectedRoute>} />
        <Route path="/admin/products/:id/edit" element={<AdminProtectedRoute><AdminProductForm /></AdminProtectedRoute>} />
        <Route path="/admin/orders" element={<AdminProtectedRoute><AdminOrders /></AdminProtectedRoute>} />
        <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
        <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  )
}

export default function App() {
  useEffect(() => {
    let mounted = true
    let removeChannel: (() => void) | undefined

    window.setTimeout(() => {
      import('./lib/supabase').then(({ supabase }) => {
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
      })
    }, 3000)

    return () => {
      mounted = false
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
