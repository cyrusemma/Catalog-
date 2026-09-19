import { Link } from 'react-router-dom'
import { 
  Storefront, 
  ShoppingBag, 
  Truck, 
  WhatsappLogo, 
  SealCheck, 
  UsersThree, 
  EnvelopeSimple, 
  Phone, 
  ChatCircleDots,
  Heart,
  Handshake
} from '@phosphor-icons/react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomPage } from '../hooks/useCms'

export default function About() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Catalog by Cyrus'
  const { data: pageData } = useCustomPage('about')

  const title = pageData?.title || `About ${storeName}`
  useDocumentTitle(pageData?.meta_title || `${title} | Our Mission & Story`)

  const contactEmail = 'cyrusadetu@gmail.com'
  const contactPhone = '0599399983'
  const whatsappNumber = settings.whatsapp_number || '0599399983'

  const pillars = [
    {
      icon: SealCheck,
      title: 'Curated Quality & Honest Pricing',
      description: 'We carefully vet catalog listings and merchant inventory to ensure you receive authentic, high-caliber goods without hidden markups.',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: WhatsappLogo,
      title: 'WhatsApp-Assisted Commerce',
      description: 'Experience real-time personal service. Every cart generates an instant, itemized invoice sent directly to our dispatch desk or merchant.',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Storefront,
      title: 'Empowering Independent Merchants',
      description: 'We give local artisans, designers, and boutique sellers their own dedicated storefront URLs (/store/:slug) and inventory management tools.',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      icon: Truck,
      title: 'Reliable Local Delivery & Hubs',
      description: 'From same-day doorstep dispatch to regional courier transit and campus pickup stations, getting your items is fast and dependable.',
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
  ]

  const steps = [
    {
      step: '01',
      title: 'Discover & Personalize',
      desc: 'Browse handpicked catalog categories, choose your colors/sizes, and build your cart effortlessly.',
    },
    {
      step: '02',
      title: 'Instant WhatsApp Invoice',
      desc: 'One click sends your itemized order breakdown directly to our coordinator or seller on WhatsApp.',
    },
    {
      step: '03',
      title: 'Secure Payment & Dispatch',
      desc: 'Confirm payment with Mobile Money (MTN/Telecel/AT) or Cash on Delivery for swift courier dispatch.',
    },
    {
      step: '04',
      title: 'Delivery & Peace of Mind',
      desc: 'Receive your parcel at your doorstep or chosen pickup station with full customer support guarantees.',
    },
  ]

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 w-full min-h-screen bg-slate-50/50 dark:bg-dark-900">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* If Custom Page HTML is set via Admin CMS */}
        {pageData?.content_html ? (
          <div className="bg-white dark:bg-dark-800/80 rounded-3xl border border-brand-400/10 p-6 sm:p-10 shadow-sm">
            <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-2">
              {pageData.title}
            </h1>
            {pageData.updated_at && (
              <p className="text-sm text-dark-800/50 dark:text-white/40 mb-8">
                Last updated: {new Date(pageData.updated_at).toLocaleDateString()}
              </p>
            )}
            <div 
              className="prose prose-brand dark:prose-invert max-w-none leading-relaxed text-dark-800/80 dark:text-white/80"
              dangerouslySetInnerHTML={{ __html: pageData.content_html }} 
            />
          </div>
        ) : (
          /* Rich Built-in About Us Page */
          <>
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-transparent border border-brand-500/20 p-8 sm:p-12 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-wider mb-4">
                <Storefront size={14} weight="bold" />
                Our Story & Vision
              </div>
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-dark-800 dark:text-white tracking-tight max-w-2xl mx-auto leading-tight">
                Modern catalog commerce built for speed, trust, and community.
              </h1>
              <p className="text-base sm:text-lg text-dark-800/70 dark:text-white/70 mt-4 max-w-2xl mx-auto leading-relaxed">
                {storeName} is a curated marketplace designed to bridge the gap between quality merchant craft and seamless digital ordering across Ghana.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition-all hover:scale-105"
                >
                  <ShoppingBag size={18} weight="bold" />
                  Explore The Catalog
                </Link>
                <Link
                  to="/sell"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-white/10 text-dark-800 dark:text-white border border-brand-400/20 font-bold text-sm transition-all"
                >
                  <Handshake size={18} weight="bold" />
                  Sell With Us
                </Link>
              </div>
            </div>

            {/* Mission Statement Card */}
            <div className="bg-white dark:bg-dark-800/90 rounded-3xl border border-brand-400/15 p-8 sm:p-10 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center shrink-0 shadow-inner">
                  <Heart size={36} weight="duotone" />
                </div>
                <div className="space-y-3 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-dark-800 dark:text-white">Why We Built {storeName}</h2>
                  <p className="text-sm sm:text-base text-dark-800/80 dark:text-white/75 leading-relaxed">
                    Shopping online should be as straightforward, responsive, and personable as walking into your favorite local boutique. By combining interactive digital catalogs with the immediacy of WhatsApp, we remove the friction of clunky payment gateways and offer instant human communication, flexible local payments, and verified delivery.
                  </p>
                </div>
              </div>
            </div>

            {/* Core Value Pillars Grid */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-dark-800 dark:text-white">What Sets Us Apart</h2>
                <p className="text-sm text-dark-800/60 dark:text-white/50 mt-1">Our commitments to buyers and merchant partners</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pillars.map((pillar, idx) => {
                  const Icon = pillar.icon
                  return (
                    <div 
                      key={idx} 
                      className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border mb-4 ${pillar.color}`}>
                          <Icon size={24} weight="duotone" />
                        </div>
                        <h3 className="text-lg font-bold text-dark-800 dark:text-white mb-2">{pillar.title}</h3>
                        <p className="text-xs sm:text-sm text-dark-800/70 dark:text-white/65 leading-relaxed">
                          {pillar.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-white dark:bg-dark-800/90 rounded-3xl border border-brand-400/15 p-8 sm:p-10 shadow-sm space-y-6">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-dark-800 dark:text-white">How Ordering Works</h2>
                <p className="text-sm text-dark-800/60 dark:text-white/50 mt-1">Simple 4-step journey from catalog discovery to doorstep delivery</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map((s, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-brand-400/10 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-black text-brand-500 tracking-wider mb-2 block">{s.step}</span>
                      <h4 className="font-bold text-sm text-dark-800 dark:text-white mb-1.5">{s.title}</h4>
                      <p className="text-xs text-dark-800/60 dark:text-white/60 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merchant Call to Action Box */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-500 p-8 sm:p-10 text-white shadow-xl shadow-brand-500/15">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold tracking-wide">
                    <UsersThree size={14} weight="bold" />
                    For Sellers & Brands
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-bold">Ready to sell your products on {storeName}?</h3>
                  <p className="text-white/80 text-sm max-w-md">
                    Launch your dedicated store link, manage catalog stock effortlessly, and accept direct customer WhatsApp orders today.
                  </p>
                </div>
                <Link
                  to="/sell"
                  className="px-6 py-3.5 rounded-2xl bg-white text-dark-900 font-bold text-sm hover:bg-slate-100 transition-all shadow-lg hover:scale-105 shrink-0"
                >
                  Join as a Merchant
                </Link>
              </div>
            </div>

            {/* Founder Note & Contact Directory */}
            <div className="bg-white dark:bg-dark-800/90 rounded-3xl border border-brand-400/15 p-8 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                  <ChatCircleDots size={22} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-dark-800 dark:text-white">Get in Touch with Our Team</h3>
                  <p className="text-xs text-dark-800/50 dark:text-white/40">We are always here to help with orders, vendor inquiries, or feedback</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a 
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-brand-400/10 hover:border-brand-500 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <WhatsappLogo size={22} weight="duotone" />
                  </div>
                  <span className="text-xs font-bold text-dark-800 dark:text-white">WhatsApp Desk</span>
                  <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{whatsappNumber}</span>
                </a>

                <a 
                  href={`mailto:${contactEmail}`} 
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-brand-400/10 hover:border-brand-500 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <EnvelopeSimple size={22} weight="duotone" />
                  </div>
                  <span className="text-xs font-bold text-dark-800 dark:text-white">Email Us</span>
                  <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{contactEmail}</span>
                </a>

                <a 
                  href={`tel:${contactPhone}`} 
                  className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-brand-400/10 hover:border-brand-500 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Phone size={22} weight="duotone" />
                  </div>
                  <span className="text-xs font-bold text-dark-800 dark:text-white">Direct Phone</span>
                  <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{contactPhone}</span>
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-brand-400/10 text-xs text-dark-800/60 dark:text-white/50">
                <div className="flex items-center gap-3">
                  <Link to="/terms" className="hover:text-brand-500 transition-colors">Terms of Service</Link>
                  <span>•</span>
                  <Link to="/privacy" className="hover:text-brand-500 transition-colors">Privacy Policy</Link>
                  <span>•</span>
                  <Link to="/faq" className="hover:text-brand-500 transition-colors">FAQ</Link>
                  <span>•</span>
                  <Link to="/feedback" className="hover:text-brand-500 transition-colors">Feedback</Link>
                </div>
                <span>&copy; {new Date().getFullYear()} {storeName}</span>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
