import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  FileText, 
  ShieldCheck, 
  ShoppingBag, 
  Truck, 
  CreditCard, 
  Storefront, 
  ArrowsCounterClockwise, 
  WarningCircle, 
  Star, 
  Scales, 
  ChatCircleDots, 
  Printer, 
  ArrowLeft,
  CheckCircle,
  Phone,
  EnvelopeSimple,
  WhatsappLogo,
  ShareNetwork,
  Info
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomPage } from '../hooks/useCms'

export default function Terms() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Catalog by Cyrus'
  const { data: pageData } = useCustomPage('terms')
  const [activeSection, setActiveSection] = useState<string>('intro')

  const title = pageData?.title || 'Terms of Service'
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
    { id: 'intro', label: '1. Acceptance & Overview', icon: FileText },
    { id: 'marketplace', label: '2. Marketplace Structure', icon: Storefront },
    { id: 'ordering', label: '3. Orders & WhatsApp Checkout', icon: ShoppingBag },
    { id: 'pricing-payment', label: '4. Pricing & Payments', icon: CreditCard },
    { id: 'delivery', label: '5. Delivery & Pickup', icon: Truck },
    { id: 'returns', label: '6. Returns & Refunds', icon: ArrowsCounterClockwise },
    { id: 'merchants', label: '7. Merchant Obligations', icon: ShieldCheck },
    { id: 'conduct', label: '8. Prohibited Conduct', icon: WarningCircle },
    { id: 'reviews', label: '9. Reviews & Feedback', icon: Star },
    { id: 'liability', label: '10. Liability & Law', icon: Scales },
    { id: 'contact', label: '11. Support & Contact', icon: ChatCircleDots },
  ]

  const contactEmail = 'cyrusadetu@gmail.com'
  const contactPhone = '0599399983'
  const whatsappNumber = settings.whatsapp_number || '0599399983'

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 w-full min-h-screen bg-slate-50/50 dark:bg-dark-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
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
                Official Legal Agreement
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-dark-800 dark:text-white tracking-tight">
                {title}
              </h1>
              <p className="text-sm text-dark-800/60 dark:text-white/60 mt-2 max-w-xl">
                Please read these terms carefully before placing orders or operating a merchant catalog on {storeName}.
              </p>
            </div>
            
            <div className="flex flex-col sm:items-end gap-1.5 text-xs text-dark-800/50 dark:text-white/40 border-t sm:border-t-0 sm:border-l border-brand-500/20 pt-4 sm:pt-0 sm:pl-6">
              <span><strong>Effective Date:</strong> January 1, 2025</span>
              <span><strong>Last Updated:</strong> {pageData?.updated_at ? new Date(pageData.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'March 2025'}</span>
              <span><strong>Estimated Reading Time:</strong> ~7 mins</span>
            </div>
          </div>
        </div>

        {/* If Custom Page HTML is set via Admin CMS */}
        {pageData?.content_html ? (
          <div className="bg-white dark:bg-dark-800/80 rounded-3xl border border-brand-400/10 p-6 sm:p-10 shadow-sm">
            <div 
              className="prose prose-brand dark:prose-invert max-w-none leading-relaxed text-dark-800/80 dark:text-white/80"
              dangerouslySetInnerHTML={{ __html: pageData.content_html }} 
            />
          </div>
        ) : (
          /* Comprehensive, Non-Generic Built-in Terms */
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
                  <p className="text-[11px] text-dark-800/40 dark:text-white/30 mb-2">Have legal or policy questions?</p>
                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Cyrus, I have a question regarding the Terms of Service.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <WhatsappLogo size={15} weight="bold" />
                    Chat with Legal Support
                  </a>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">

              {/* Key Takeaways Card */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 text-sm text-dark-800 dark:text-white/90">
                <div className="flex items-start gap-3">
                  <Info size={22} weight="duotone" className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Key Summary for Customers & Merchants</h4>
                    <p className="text-xs text-dark-800/70 dark:text-white/70 leading-relaxed">
                      {storeName} provides a direct-to-consumer and merchant catalog marketplace with WhatsApp-assisted order coordination. We prioritize verified product listings, secure mobile payments, prompt local delivery, and transparent merchant communication.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section id="intro" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <FileText size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">1. Acceptance of Terms & Overview</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    These Terms of Service ("Terms") constitute a legally binding agreement between you (whether as a guest visitor, customer, or registered merchant) and <strong>{storeName}</strong> ("we", "us", or "our"), governing your access to and use of our website, mobile interface, catalog catalogs, and related shopping services.
                  </p>
                  <p>
                    By browsing our catalog, adding items to your cart, creating an account, or submitting an order through our automated WhatsApp checkout, you confirm that you are at least 18 years of age (or possess valid parental/guardian authorization) and agree to abide by these Terms in full.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="marketplace" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Storefront size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">2. Marketplace Architecture & Storefronts</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    {storeName} operates as a hybrid digital marketplace. Our platform enables:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Curated Central Catalog:</strong> Direct inventory managed by {storeName} featuring verified high-demand products.</li>
                    <li><strong>Independent Merchant Storefronts:</strong> Dedicated storefront spaces (<code className="text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded text-xs">/store/:slug</code>) operated by approved third-party vendors and artisans.</li>
                  </ul>
                  <p>
                    While we enforce high listing standards, merchants are individually accountable for inventory precision, item specifications, and handling localized fulfillment for orders placed with their stores.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section id="ordering" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <ShoppingBag size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">3. Orders & WhatsApp Checkout System</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    To ensure rapid customer communication and personalized assistance, orders placed on {storeName} utilize a smart WhatsApp order generation protocol:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <p className="font-semibold text-dark-800 dark:text-white text-xs mb-1">📋 Order Formulation</p>
                      <p className="text-xs text-dark-800/60 dark:text-white/60">Your cart calculates exact item quantities, variant choices (colors/sizes), base delivery fees, and assigns a unique Order Reference.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <p className="font-semibold text-dark-800 dark:text-white text-xs mb-1">💬 Direct Confirmation</p>
                      <p className="text-xs text-dark-800/60 dark:text-white/60">Clicking checkout launches WhatsApp with your pre-formatted invoice sent directly to our dispatch coordinator or merchant.</p>
                    </div>
                  </div>
                  <p className="text-xs">
                    * Orders are deemed finalized once payment or delivery arrangement is confirmed with the merchant or support desk over WhatsApp.
                  </p>
                </div>
              </section>

              {/* Section 4 */}
              <section id="pricing-payment" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <CreditCard size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">4. Pricing, Currency & Payment Terms</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    All listed prices are displayed primarily in <strong>Ghanaian Cedis (GH₵ / GHS)</strong> unless otherwise converted by your local currency selector. Prices shown are inclusive of applicable listing fees but exclude regional courier dispatch charges unless free delivery is explicitly indicated.
                  </p>
                  <h4 className="font-semibold text-dark-800 dark:text-white text-xs uppercase tracking-wider mt-2">Accepted Payment Channels:</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <li className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                      <span><strong>Mobile Money (MoMo):</strong> MTN, Telecel, AT Money</span>
                    </li>
                    <li className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                      <span><strong>Bank Transfer / Instant EFT:</strong> Verified account receipts</span>
                    </li>
                    <li className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                      <span><strong>Cash on Delivery (COD):</strong> For eligible local delivery zones</span>
                    </li>
                    <li className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <CheckCircle size={15} weight="fill" className="text-emerald-500 shrink-0" />
                      <span><strong>In-Person Pickup:</strong> Cash or MoMo on collection</span>
                    </li>
                  </ul>
                  <p className="text-xs text-dark-800/60 dark:text-white/50">
                    Buyers must ensure that transaction references and payment screenshots are provided when confirming orders to prevent fulfillment delays.
                  </p>
                </div>
              </section>

              {/* Section 5 */}
              <section id="delivery" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Truck size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">5. Fulfillment, Delivery & Collection Policies</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    Delivery timelines and dispatch methods vary depending on destination and chosen logistics option:
                  </p>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>🚀 Same-Day / Next-Day Local Delivery:</strong> Available for intra-city orders confirmed before cut-off hours. Dispatch riders coordinate directly with the phone number provided at checkout.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>📦 Regional & Nationwide Courier:</strong> Typically completed within 1 to 3 business days via established regional bus terminals or verified parcel couriers.
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-brand-400/10">
                      <strong>📍 Pickup Stations / Campus Hubs:</strong> Buyers who select pickup will be notified as soon as packages are ready for collection at designated dispatch points.
                    </div>
                  </div>
                  <p className="text-xs text-dark-800/60 dark:text-white/50">
                    <strong>Inspection on Delivery:</strong> Customers are encouraged to inspect goods immediately upon arrival in the presence of the courier to verify package condition before releasing payment or signing delivery confirmation.
                  </p>
                </div>
              </section>

              {/* Section 6 */}
              <section id="returns" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <ArrowsCounterClockwise size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">6. Returns, Exchanges & Cancellation Policy</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    We want you to be completely satisfied with every purchase made on {storeName}. Our return and exchange framework is structured as follows:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Defective or Damaged Goods:</strong> Any manufacturing defects or shipping damage must be reported within <strong>48 hours</strong> of delivery with clear photo/video evidence.</li>
                    <li><strong>Wrong Item Received:</strong> If the delivered product differs from your order confirmation (e.g. wrong size/color/model), we or the respective merchant will arrange a complimentary exchange at zero additional shipping cost.</li>
                    <li><strong>Condition Requirements:</strong> Returned merchandise must be unused, unwashed, in its original packaging, and with all protective tags intact.</li>
                    <li><strong>Non-Returnable Items:</strong> For hygiene and safety standards, certain categories such as intimate apparel, swimwear, perishables, and custom bespoke items cannot be returned unless defective.</li>
                  </ul>
                  <p className="text-xs text-dark-800/60 dark:text-white/50">
                    Refunds are processed within 24–48 hours upon physical receipt and verification of the returned item.
                  </p>
                </div>
              </section>

              {/* Section 7 */}
              <section id="merchants" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <ShieldCheck size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">7. Merchant Standards & Catalog Integrity</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    Merchants registering and selling on {storeName} agree to adhere to strict ethical standards:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                    <li><strong>Authenticity Guarantee:</strong> Sellers must only list authentic goods. The listing of counterfeit, replica, unlicensed, or stolen merchandise is strictly prohibited and results in immediate account termination.</li>
                    <li><strong>Accurate Product Data:</strong> Product imagery, descriptions, pricing, and stock levels must be honest, up-to-date, and accurately reflect actual product condition.</li>
                    <li><strong>Customer Communication:</strong> Merchants must handle customer inquiries, order updates, and warranty issues respectfully and promptly.</li>
                  </ul>
                </div>
              </section>

              {/* Section 8 */}
              <section id="conduct" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <WarningCircle size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">8. Prohibited User Conduct</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-2 leading-relaxed">
                  <p>Users are strictly prohibited from:</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                    <li>Submitting fraudulent orders, fake delivery addresses, or phantom checkout requests.</li>
                    <li>Engaging in harassment, defamation, or abusive communication towards merchants, couriers, or support agents.</li>
                    <li>Attempting unauthorized automated scraping, vulnerability exploitation, or denial of service attacks against our web infrastructure.</li>
                  </ul>
                </div>
              </section>

              {/* Section 9 */}
              <section id="reviews" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Star size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">9. Reviews, Ratings & Customer Feedback</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    Customers may submit ratings and reviews on products, overall marketplace experience, and merchant storefronts. Reviews must reflect honest, firsthand experiences. {storeName} reserves the right to moderate and remove reviews that contain hate speech, spam, promotional advertisements, or fabricated claims.
                  </p>
                </div>
              </section>

              {/* Section 10 */}
              <section id="liability" className="bg-white dark:bg-dark-800/90 rounded-2xl border border-brand-400/15 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                    <Scales size={20} weight="duotone" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">10. Limitation of Liability & Governing Law</h2>
                </div>
                <div className="text-sm text-dark-800/80 dark:text-white/70 space-y-3 leading-relaxed">
                  <p>
                    {storeName} provides the catalog interface on an "as is" and "as available" basis. To the maximum extent permitted by applicable law, {storeName} and its operators shall not be held liable for indirect, incidental, special, or consequential damages resulting from third-party delivery delays, merchant product failures, or network disruptions.
                  </p>
                  <p>
                    <strong>Governing Law:</strong> These Terms shall be interpreted and governed in accordance with the statutory laws of the <strong>Republic of Ghana</strong>. Any disputes arising under these terms shall first be submitted to informal dispute mediation through our official support team.
                  </p>
                </div>
              </section>

              {/* Section 11 - Contact Support Box */}
              <section id="contact" className="bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-transparent rounded-2xl border border-brand-500/25 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
                    <ChatCircleDots size={20} weight="bold" />
                  </div>
                  <h2 className="text-xl font-bold text-dark-800 dark:text-white">11. Official Support & Policy Inquiries</h2>
                </div>
                <p className="text-sm text-dark-800/80 dark:text-white/70 mb-6 leading-relaxed">
                  If you have questions regarding these Terms of Service, wish to report a merchant violation, or need order dispute assistance, please reach out directly through our verified channels:
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
                    <span className="text-xs font-bold text-dark-800 dark:text-white">Email Inquiries</span>
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
                    <Link to="/privacy" className="hover:text-brand-500 underline font-medium">Privacy Policy</Link>
                    <span>•</span>
                    <Link to="/faq" className="hover:text-brand-500 underline font-medium">Frequently Asked Questions</Link>
                    <span>•</span>
                    <Link to="/feedback" className="hover:text-brand-500 underline font-medium">Share Feedback</Link>
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
