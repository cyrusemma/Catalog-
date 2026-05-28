import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store, ExternalLink, Menu, X, MessageSquareQuote, Palette } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { path: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
]

type AdminTheme = 'light' | 'amoled' | 'gold'

const ADMIN_THEME_KEY = 'catalog-admin-theme'

const adminThemes: { value: AdminTheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'amoled', label: 'AMOLED' },
  { value: 'gold', label: 'Gold' },
]

function getInitialAdminTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(ADMIN_THEME_KEY)
  return stored === 'amoled' || stored === 'gold' || stored === 'light' ? stored : 'light'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [adminTheme, setAdminTheme] = useState<AdminTheme>(getInitialAdminTheme)

  useEffect(() => {
    localStorage.setItem(ADMIN_THEME_KEY, adminTheme)
  }, [adminTheme])

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path)

  const currentLabel =
    navItems.find(item => isActive(item.path, item.exact))?.label ?? 'Admin'

  const SidebarBody = (
    <>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-400 rounded-xl flex items-center justify-center">
            <Store size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          className="lg:hidden w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive(item.path, item.exact)
                ? 'bg-brand-400 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-3">
        <div className="px-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
            <Palette size={13} />
            Admin theme
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
            {adminThemes.map(theme => (
              <button
                key={theme.value}
                type="button"
                onClick={() => setAdminTheme(theme.value)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  adminTheme === theme.value
                    ? 'bg-brand-400 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
        >
          <ExternalLink size={17} /> View Store
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={17} /> Logout
        </button>
      </div>
    </>
  )

  return (
    <div className={`admin-shell admin-theme-${adminTheme} min-h-dvh bg-[#f8f4ef]`}>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-gray-100 safe-top">
        <div className="h-14 px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="w-10 h-10 -ml-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center justify-center"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-400 rounded-lg flex items-center justify-center">
              <Store size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">{currentLabel}</span>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View store"
            className="w-10 h-10 -mr-2 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center justify-center"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </header>

      {/* Desktop sidebar (persistent) */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-gray-100 flex-col fixed inset-y-0 z-30">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white border-r border-gray-100 flex flex-col z-50 safe-top"
            >
              {SidebarBody}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="lg:ml-56">
        {children}
      </main>
    </div>
  )
}
