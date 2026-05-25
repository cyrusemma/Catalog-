import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './lib/supabase'
import { isAdminSession } from './lib/admin'
import type { Session } from '@supabase/supabase-js'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import BottomNav from './components/layout/BottomNav'

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

function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (!session) return <Navigate to="/admin/login" replace />
  if (!isAdminSession(session)) {
    return <Navigate to="/admin/login" replace state={{ error: 'unauthorized' }} />
  }
  return <>{children}</>
}

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh overflow-x-hidden">
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
    </div>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col flex-1"
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes({ session }: { session: Session | null }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Storefront */}
        <Route path="/" element={<StorefrontLayout><PageTransition><Home /></PageTransition></StorefrontLayout>} />
        <Route path="/shop" element={<StorefrontLayout><PageTransition><Shop /></PageTransition></StorefrontLayout>} />
        <Route path="/product/:id" element={<StorefrontLayout><PageTransition><ProductDetail /></PageTransition></StorefrontLayout>} />
        <Route path="/cart" element={<StorefrontLayout><PageTransition><Cart /></PageTransition></StorefrontLayout>} />
        <Route path="/wishlist" element={<StorefrontLayout><PageTransition><Wishlist /></PageTransition></StorefrontLayout>} />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute session={session}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/products" element={<ProtectedRoute session={session}><AdminProducts /></ProtectedRoute>} />
        <Route path="/admin/products/new" element={<ProtectedRoute session={session}><AdminProductForm /></ProtectedRoute>} />
        <Route path="/admin/products/:id/edit" element={<ProtectedRoute session={session}><AdminProductForm /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute session={session}><AdminOrders /></ProtectedRoute>} />
        <Route path="/admin/reviews" element={<ProtectedRoute session={session}><AdminReviews /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute session={session}><AdminSettings /></ProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('store-settings-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        () => qc.invalidateQueries({ queryKey: ['store-settings'] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="min-h-dvh bg-cream-50 dark:bg-dark-900 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <AnimatedRoutes session={session} />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
