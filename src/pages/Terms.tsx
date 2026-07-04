import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'

export default function Terms() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Our Marketplace'
  useDocumentTitle(`Terms of Service | ${storeName}`)

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 w-full">
      <div className="max-w-3xl mx-auto prose prose-brand dark:prose-invert">
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-dark-800/50 dark:text-white/40 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">1. Acceptance of Terms</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            By accessing and using {storeName} ("the Platform"), you accept and agree to be bound by the terms 
            and provision of this agreement. If you do not agree to abide by these terms, please do not use this Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">2. Marketplace Role</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            {storeName} acts as a venue to allow users who comply with our policies to offer, sell, and buy goods. 
            We are not directly involved in the transaction between buyers and sellers. As a result, we have no control 
            over the quality, safety, morality or legality of any aspect of the items listed, the truth or accuracy of 
            the listings, the ability of sellers to sell items or the ability of buyers to pay for items.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">3. User Accounts</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            To use certain features of the Platform, you must register for an account. You are responsible for 
            maintaining the confidentiality of your account information, including your password, and for all activity 
            that occurs under your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">4. Prohibited Items and Activities</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            You agree not to list or sell items that are illegal, counterfeit, stolen, or otherwise violate our policies. 
            You also agree not to engage in any activity that interferes with or disrupts the Platform or the servers 
            and networks connected to the Platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">5. Buyer and Seller Obligations</h2>
          <ul className="list-disc pl-5 text-dark-800/70 dark:text-white/60 space-y-2 mb-4">
            <li><strong>Buyers:</strong> Must ensure they have the funds and intent to complete a purchase before placing an order.</li>
            <li><strong>Sellers (Merchants):</strong> Must provide accurate descriptions of items, fulfill orders promptly, and handle customer service inquiries regarding their products.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">6. Returns and Refunds</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            Refunds and returns are subject to the individual policies of the merchants you purchase from, unless otherwise 
            dictated by local consumer protection laws. {storeName} may step in to mediate disputes, but is not responsible 
            for issuing refunds for products sold by third-party merchants.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">7. Limitation of Liability</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            In no event shall {storeName}, nor its directors, employees, partners, agents, suppliers, or affiliates, 
            be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, 
            loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or 
            inability to access or use the Platform.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">8. Modifications to Terms</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes 
            a material change will be determined at our sole discretion. By continuing to access or use our Platform after 
            those revisions become effective, you agree to be bound by the revised terms.
          </p>
        </section>
      </div>
    </div>
  )
}
