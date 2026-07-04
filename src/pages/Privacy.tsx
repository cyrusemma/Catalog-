import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { ScrollContainer } from '../components/ui/ScrollContainer'

export default function Privacy() {
  const settings = useStoreSettings()
  const storeName = settings.store_name || 'Our Marketplace'
  useDocumentTitle(`Privacy Policy | ${storeName}`)

  return (
    <ScrollContainer className="pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto prose prose-brand dark:prose-invert">
        <h1 className="text-3xl font-display font-bold text-dark-800 dark:text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-dark-800/50 dark:text-white/40 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">1. Introduction</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            Welcome to {storeName}. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you as to how we look after your personal data when you visit our website 
            and tell you about your privacy rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">2. The Data We Collect</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            We may collect, use, store and transfer different kinds of personal data about you, including:
          </p>
          <ul className="list-disc pl-5 text-dark-800/70 dark:text-white/60 space-y-2 mb-4">
            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data:</strong> includes billing address, delivery address, email address and telephone numbers.</li>
            <li><strong>Transaction Data:</strong> includes details about payments and other details of products you have purchased from us or our merchants.</li>
            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">3. How We Use Your Data</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-5 text-dark-800/70 dark:text-white/60 space-y-2 mb-4">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g. processing an order).</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">4. Data Sharing with Merchants</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            As {storeName} operates as a marketplace, when you purchase a product from a specific merchant, 
            we will share necessary Contact and Transaction Data with that merchant solely for the purpose of 
            fulfilling your order. Merchants are strictly prohibited from using your data for any other purpose 
            without your explicit consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">5. Data Security</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, 
            used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data 
            to those employees, agents, contractors and other third parties who have a business need to know.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">6. Your Legal Rights</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, 
            including the right to request access, correction, erasure, restriction, transfer, to object to processing, 
            to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-dark-800 dark:text-white">7. Contact Us</h2>
          <p className="text-dark-800/70 dark:text-white/60 mb-4 leading-relaxed">
            If you have any questions about this privacy policy or our privacy practices, please contact us at our 
            designated support channels.
          </p>
        </section>
      </div>
    </ScrollContainer>
  )
}
