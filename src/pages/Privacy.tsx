import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  ShieldCheck, 
  LockKey, 
  Database, 
  ShareNetwork, 
  Printer, 
  ArrowLeft,
  CheckCircle,
  Phone,
  EnvelopeSimple,
  WhatsappLogo,
  Info,
  UserGear,
  DeviceMobile,
  Storefront,
  EyeSlash,
  ChatCircleDots
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomPage } from '../hooks/useCms'

export default function Privacy() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Catalog by Cyrus'
  const { data: pageData } = useCustomPage('privacy')
  const [activeSection, setActiveSection] = useState<string>('intro')

  const title = pageData?.title || 'Privacy Policy'
  useDocumentTitle(pageData?.meta_title || `${title} | ${storeName}`)

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} - ${storeName}`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const scrollTo = (id: string) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -90
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const sections = [
    { id: 'intro', label: '1. Privacy Commitment & Scope', icon: ShieldCheck },
    { id: 'collection', label: '2. Information We Collect', icon: Database },
    { id: 'whatsapp-orders', label: '3. WhatsApp & Order Data Flow', icon: DeviceMobile },
    { id: 'usage', label: '4. How We Use Your Data', icon: UserGear },
    { id: 'merchant-sharing', label: '5. Merchant & Courier Sharing', icon: Storefront },
    { id: 'storage-cookies', label: '6. Storage & Offline Caching', icon: LockKey },
    { id: 'security', label: '7. Data Security & Retention', icon: EyeSlash },
    { id: 'rights', label: '8. Your Rights & Data Control', icon: CheckCircle },
    { id: 'contact', label: '9. Contact & Inquiries', icon: ChatCircleDots },
  ]

  const contactEmail = 'cyrusadetu@gmail.com'
  const contactPhone = '0599399983'
  const whatsappNumber = settings.whatsapp_number || '0599399983'

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 w-full min-h-screen bg-slate-50/50 dark:bg-dark-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb & Utility Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-medium text-dark-800/60 dark:text-white/60 hover:text-brand-500 transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            Back to Marketplace
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-brand-400/20 text-xs font-semibold text-dark-800/70 dark:text-white/70 hover:bg-brand-50 dark:hover:bg-white/10 transition-colors shadow-sm"
              title="Share document link"
            >
              <ShareNetwork size={15} weight="bold" />
              Share
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-brand-400/20 text-xs font-semibold text-dark-800/70 dark:text-white/70 hover:bg-brand-50 dark:hover:bg-white/10 transition-colors shadow-sm"
              title="Print document"
            >
              <Printer size={15} weight="bold" />
              Print
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 p-6 sm:p-10 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-bold uppercase tracking-wider mb-3">
                <ShieldCheck size={14} weight="bold" />
                Data Protection & Privacy
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-dark-800/60 dark:text-white/60 mt-2 max-w-xl">
                We are dedicated to safeguarding your personal data, order records, and shopping privacy on {storeName}.
              </p>
            </div>
            
            <div className="flex flex-col sm:items-end gap-1.5 text-xs text-dark-800/50 dark:text-white/40 border-t sm:border-t-0 sm:border-l border-brand-500/20 pt-4 sm:pt-0 sm:pl-6">
              <span><strong>Effective Date:</strong> January 1, 2025</span>
              <span><strong>Last Updated:</strong> {pageData?.updated_at ? new Date(pageData.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'March 2025'}</span>
              <span><strong>Estimated Reading Time:</strong> ~6 mins</span>
            </div>
          </div>
        </div>

        {/* Dynamic CMS Override or Built-in Tailored Privacy Policy */}
        {pageData?.content_html ? (
          <div className="bg-white dark:bg-dark-800/80 rounded-3xl border border-brand-400/10 p-6 sm:p-10 shadow-sm">
            <div 
              className="prose prose-brand dark:prose-invert max-w-none leading-relaxed text-dark-800/80 dark:text-white/80"
              dangerouslySetInnerHTML={{ __html: pageData.content_html }} 
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Quick Navigation Sidebar / Table of Contents */}
            <div className="lg:col-span-4 sticky top-24 hidden lg:block">
              <div className="bg-white dark:bg-dark-800/80 rounded-2xl border border-brand-400/15 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-dark-800/50 dark:text-white/40 mb-3 px-2">
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {sections.map((sec) => {
                    const Icon = sec.icon
                    const isActive = activeSection === sec.id
                    return (
                      <button
                        key={sec.id}
                        onClick={() => scrollTo(sec.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                          isActive 
                            ? 'bg-brand-500 text-white font-semibold shadow-sm' 
                            : 'text-dark-800/70 dark:text-white/70 hover:bg-brand-50 dark:hover:bg-white/5 hover:text-brand-500'
                        }`}
                      >
                        <Icon size={16} weight={isActive ? "fill" : "duotone"} className="shrink-0" />
                        <span className="truncate">{sec.label}</span>
                      </button>
                    )
                  })}
                </nav>

                <div className="mt-6 pt-4 border-t border-brand-400/10 px-2">
                  <p className="text-[11px] text-dark-800/40 dark:text-white/30 mb-2">Questions about your data?</p>
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Cyrus, I have a question regarding data privacy on the platform.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <WhatsappLogo size={15} weight="bold" />
                    Chat with Privacy Officer
                  </a>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">

              {/* Key Privacy Highlights Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-sm text-dark-800 dark:text-white/90">
                <div className="flex items-start gap-3">
                  <Info size={22} weight="duotone" className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm mb-1">Our Privacy Promise</h4>
                    <p className="text-xs text-dark-800/70 dark:text-white/70 leading-relaxed">
                      We do not sell, rent, or trade your personal information. Customer data is utilized exclusively to process your catalog orders, coordinate WhatsApp deliveries with verified merchants, and enhance your shopping experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section id="intro" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <ShieldCheck size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">1. Privacy Commitment & Scope</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    <strong>{storeName}</strong> ("we", "us", or "our") respects your personal integrity and is committed to protecting your privacy in compliance with applicable data protection legislation, including Ghana's <em>Data Protection Act, 2012 (Act 843)</em>.
                  </p>
                  <p>
                    This Privacy Policy applies to all visitors, buyers, registered customer accounts, and merchant operators using our web platform, progressive web application (PWA), and WhatsApp-integrated ordering channels.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="collection" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Database size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">2. Information We Collect</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>We collect only the minimum information necessary to provide a smooth catalog and fulfillment experience:</p>
                  
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>👤 Contact & Identification Data:</strong> Full name, telephone number (for WhatsApp messaging and courier calls), delivery address, and optional email for account notifications.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>🛍️ Order & Cart Information:</strong> Products selected, chosen variants (sizes, colors), order notes, delivery preference (doorstep or pickup), and order reference IDs.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>💳 Transaction Verifications:</strong> Mobile Money (MoMo) transaction IDs or bank reference numbers submitted to verify order payments. We do not store credit card PINs or mobile money wallets passwords.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>📱 Device & Technical Telemetry:</strong> Anonymous browser user agent, IP address for regional routing, screen dimensions, and visit timestamps to maintain app uptime and security.
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3 */}
              <section id="whatsapp-orders" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <DeviceMobile size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">3. WhatsApp & Order Data Flow</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    When you proceed through our "Checkout with WhatsApp" flow:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li>An automated summary containing your items, subtotal, and chosen delivery method is formatted into a pre-filled WhatsApp message.</li>
                    <li>The message is delivered directly into your personal WhatsApp client, initiating end-to-end encrypted chat with our dispatch desk or the specific merchant.</li>
                    <li>We do not record private WhatsApp conversations outside the scope of fulfilling your order and resolving customer support inquiries.</li>
                  </ul>
                </div>
              </section>

              {/* Section 4 */}
              <section id="usage" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <UserGear size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">4. How We Use Your Information</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-2 leading-relaxed">
                  <p>Your personal data is used strictly for legitimate commercial and operational purposes:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li>Generating invoices, assigning delivery couriers, and confirming order arrivals.</li>
                    <li>Notifying you of important order status updates (e.g. dispatched, ready for pickup).</li>
                    <li>Allowing you to track past orders, manage wishlists, and leave authentic feedback.</li>
                    <li>Preventing malicious bot activity, fraudulent order submissions, and platform spam.</li>
                  </ul>
                </div>
              </section>

              {/* Section 5 */}
              <section id="merchant-sharing" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Storefront size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">5. Merchant & Courier Data Scoping</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    Because {storeName} features independent merchant storefronts (<code className="text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded text-xs">/store/:slug</code>):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <p className="font-semibold text-dark-800 dark:text-white mb-1">🏪 Merchant Data Boundary</p>
                      <p className="text-dark-800/60 dark:text-white/60">Merchants only access contact and item details required to pack and dispatch orders placed with their specific storefront.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <p className="font-semibold text-dark-800 dark:text-white mb-1">🛵 Courier Delivery Handoff</p>
                      <p className="text-dark-800/60 dark:text-white/60">Dispatch riders receive only the recipient name, delivery phone number, and physical drop-off destination.</p>
                    </div>
                  </div>
                  <p className="text-xs text-dark-800/60 dark:text-white/50">
                    * Merchants and couriers are strictly prohibited from using customer phone numbers for unsolicited marketing, re-selling contact lists, or non-order communication.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="storage-cookies" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <LockKey size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">6. Local Storage, Cookies & PWA Caching</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    To ensure fast load times and offline browsing, our Progressive Web Application (PWA) uses standard browser local storage and IndexedDB:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Cart & Wishlist Cache:</strong> Stores your selected items on your device so your cart remains intact between visits.</li>
                    <li><strong>Offline Order Queue:</strong> If an order is created while connection is weak, it is securely queued locally and synced once reconnected.</li>
                    <li><strong>No Invasive Trackers:</strong> We do not deploy third-party advertising cookies or cross-site tracking pixels.</li>
                  </ul>
                </div>
              </section>

              {/* Section 7 */}
              <section id="security" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <EyeSlash size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">7. Data Security & Storage Safeguards</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    We implement industry-standard technical and operational safeguards:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                    <li>Encrypted TLS 1.3 / HTTPS connections across all pages and APIs.</li>
                    <li>Database Row-Level Security (RLS) ensuring users only have access to their own account data.</li>
                    <li>Strict administrative access controls restricted to authorized staff.</li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="rights" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <CheckCircle size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">8. Your Rights & Data Control</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-2 leading-relaxed">
                  <p>Under applicable privacy laws, you possess the right to:</p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Access & Review:</strong> View personal profile and order history at any time from your Account settings.</li>
                    <li><strong>Data Correction:</strong> Update outdated phone numbers or delivery addresses directly in your profile.</li>
                    <li><strong>Account & Data Deletion:</strong> Request complete deletion of your account and personal identifiers from our databases.</li>
                  </ul>
                </div>
              </section>

              {/* Section 9 - Contact Privacy Box */}
              <section id="contact" className="bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-transparent rounded-2xl border border-brand-500/25 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                    <ChatCircleDots size={20} weight="bold" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">9. Privacy Inquiries & Data Requests</h2>
                </div>
                <p className="text-sm text-dark-800/80 dark:text-white/70 mb-6 leading-relaxed">
                  For data deletion requests, privacy questions, or reporting any unauthorized merchant communications, reach our team directly:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a 
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-white/5 border border-brand-400/15 hover:border-brand-500 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <WhatsappLogo size={22} weight="duotone" />
                    </div>
                    <span className="text-xs font-bold text-dark-800 dark:text-white">WhatsApp Support</span>
                    <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{whatsappNumber}</span>
                  </a>

                  <a 
                    href={`mailto:${contactEmail}`} 
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-white/5 border border-brand-400/15 hover:border-brand-500 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <EnvelopeSimple size={22} weight="duotone" />
                    </div>
                    <span className="text-xs font-bold text-dark-800 dark:text-white">Privacy Email</span>
                    <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{contactEmail}</span>
                  </a>

                  <a 
                    href={`tel:${contactPhone}`} 
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-white/5 border border-brand-400/15 hover:border-brand-500 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Phone size={22} weight="duotone" />
                    </div>
                    <span className="text-xs font-bold text-dark-800 dark:text-white">Direct Line</span>
                    <span className="text-[11px] text-dark-800/60 dark:text-white/50 mt-0.5">{contactPhone}</span>
                  </a>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-brand-500/20 text-xs text-dark-800/60 dark:text-white/60">
                  <div className="flex items-center gap-3">
                    <Link to="/terms" className="hover:text-brand-500 underline font-medium">Terms of Service</Link>
                    <span>•</span>
                    <Link to="/faq" className="hover:text-brand-500 underline font-medium">Frequently Asked Questions</Link>
                    <span>•</span>
                    <Link to="/feedback" className="hover:text-brand-500 underline font-medium">Leave Feedback</Link>
                  </div>
                  <span>&copy; {new Date().getFullYear()} {storeName}</span>
                </div>
              </section>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}
