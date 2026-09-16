import { useParams, Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomPage } from '../hooks/useCms'
import { ArrowLeft, AlertCircle } from 'lucide-react'


interface CustomPageProps {
  forcedSlug?: string
}

export default function CustomPage({ forcedSlug }: CustomPageProps) {
  const { slug: routeSlug } = useParams<{ slug: string }>()
  const slug = forcedSlug || routeSlug || ''

  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Our Marketplace'
  const { data: pageData, isLoading } = useCustomPage(slug)

  const defaultTitles: Record<string, string> = {
    about: 'About Us',
    faq: 'Frequently Asked Questions',
  }

  const title = pageData?.title || defaultTitles[slug] || 'Information'
  useDocumentTitle(pageData?.meta_title || `${title} | ${storeName}`)

  if (isLoading) {
    return (
      <div className="pt-28 pb-20 px-4 max-w-3xl mx-auto text-center text-gray-400">
        Loading content...
      </div>
    )
  }

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 w-full min-h-screen">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-amber-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {pageData ? (
          <div className="prose prose-brand dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-2">
              {pageData.title}
            </h1>
            {pageData.updated_at && (
              <p className="text-sm text-dark-800/50 dark:text-white/40 mb-8">
                Last updated: {new Date(pageData.updated_at).toLocaleDateString()}
              </p>
            )}

            <div 
              className="prose-content leading-relaxed text-dark-800/80 dark:text-white/80"
              dangerouslySetInnerHTML={{ __html: pageData.content_html }} 
            />
          </div>
        ) : slug === 'about' ? (
          /* Default About Us template fallback */
          <div className="prose prose-brand dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-4">
              About {storeName}
            </h1>
            <p className="text-lg text-dark-800/80 dark:text-white/80 leading-relaxed mb-6">
              Welcome to {storeName} — your premier destination for curated, high-quality products and independent merchant discoveries.
            </p>
            <h2 className="text-xl font-bold text-dark-800 dark:text-white mt-8 mb-4">Our Mission</h2>
            <p className="text-dark-800/70 dark:text-white/70 leading-relaxed mb-4">
              We empower local merchants and artisans to bring their best products directly to customers, backed by transparent pricing, instant customer support over WhatsApp, and reliable delivery.
            </p>
          </div>
        ) : slug === 'faq' ? (
          /* Default FAQ template fallback */
          <div className="prose prose-brand dark:prose-invert max-w-none">
            <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-6">
              Frequently Asked Questions
            </h1>
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-base font-bold text-dark-800 dark:text-white mb-2">How do I place an order?</h3>
                <p className="text-sm text-dark-800/70 dark:text-white/70">
                  Browse products, add items and variants to your cart, and click "Checkout with WhatsApp". You will be connected directly with our team to confirm details and dispatch.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-base font-bold text-dark-800 dark:text-white mb-2">What payment methods are accepted?</h3>
                <p className="text-sm text-dark-800/70 dark:text-white/70">
                  We support Mobile Money (MTN, Telecel, AirtelTigo), Bank Transfer, and Cash on Delivery depending on your location.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-gray-100 dark:border-white/5 shadow-sm">
                <h3 className="text-base font-bold text-dark-800 dark:text-white mb-2">How long does delivery take?</h3>
                <p className="text-sm text-dark-800/70 dark:text-white/70">
                  Most local orders are delivered within 24–48 hours after payment confirmation.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Page Not Found</h2>
            <p className="text-xs text-gray-500 mb-6">The page you are looking for does not exist or has been removed.</p>
            <Link
              to="/"
              className="px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl inline-flex items-center"
            >
              Go to Storefront
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
