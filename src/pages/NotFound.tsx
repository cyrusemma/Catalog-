import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  ArrowLeft, 
  ShoppingBag, 
  Newspaper, 
  HelpCircle, 
  Sparkles 
} from 'lucide-react'
import SEOHead from '../components/layout/SEOHead'


export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const quickLinks = [
    { label: 'Browse All Products', href: '/shop', icon: ShoppingBag, desc: 'Discover our newest arrivals and catalog items.' },
    { label: 'Stories & Blog', href: '/blog', icon: Newspaper, desc: 'Read product guides, lookbooks, and styling tips.' },
    { label: 'Customer FAQs', href: '/faq', icon: HelpCircle, desc: 'Answers to delivery, ordering, and payment questions.' },
  ]

  return (
    <div className="pt-28 pb-24 px-4 sm:px-6 w-full min-h-[85vh] flex items-center justify-center">
      <SEOHead
        title="Page Not Found (404)"
        description="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
      />

      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          404 — Page Not Found
        </div>

        {/* Big Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-display font-bold text-dark-800 dark:text-white tracking-tight">
            Lost in the Catalog?
          </h1>
          <p className="text-base sm:text-lg text-dark-800/60 dark:text-white/60 max-w-lg mx-auto">
            The page you are looking for doesn't exist, was moved, or has expired. Let's get you back to the good stuff.
          </p>
        </div>

        {/* Product Search Form */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products in our store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-24 py-3.5 bg-white dark:bg-dark-900 border border-dark-800/10 dark:border-white/10 rounded-2xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick Discovery Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                to={link.href}
                className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-dark-800/10 dark:border-white/10 shadow-sm hover:border-amber-500/40 hover:shadow-md transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-dark-800 dark:text-white group-hover:text-amber-500 transition-colors">
                  {link.label}
                </h3>
                <p className="text-[11px] text-dark-800/50 dark:text-white/40 mt-1 line-clamp-2">
                  {link.desc}
                </p>
              </Link>
            )
          })}
        </div>

        {/* Back to Home Button */}
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-dark-900 dark:bg-white text-white dark:text-dark-900 text-sm font-bold rounded-2xl shadow-md hover:bg-dark-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  )
}
