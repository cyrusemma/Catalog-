import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminLoginOTP = lazy(() => import('./pages/admin/AdminLoginOTP'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

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
    <div className="flex flex-col min-h-dvh">
      <Navbar />
      {children}
      <Footer />
      <BottomNav />
    </div>
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
          <Routes>
            {/* Storefront */}
            <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
            <Route path="/shop" element={<StorefrontLayout><Shop /></StorefrontLayout>} />
            <Route path="/product/:id" element={<StorefrontLayout><ProductDetail /></StorefrontLayout>} />
            <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/login-otp" element={<AdminLoginOTP />} />
            <Route path="/admin" element={<ProtectedRoute session={session}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute session={session}><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/products/new" element={<ProtectedRoute session={session}><AdminProductForm /></ProtectedRoute>} />
            <Route path="/admin/products/:id/edit" element={<ProtectedRoute session={session}><AdminProductForm /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute session={session}><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute session={session}><AdminSettings /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
