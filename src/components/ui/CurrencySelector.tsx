import { useState, useRef, useEffect } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCurrencyStore } from '../../store/currencyStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'

const CURRENCIES = ['GHS', 'USD', 'GBP', 'EUR', 'NGN', 'KES', 'ZAR']

export default function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore()
  const settings = useStoreSettings()
  const baseCurrency = settings?.currency || 'GHS'
  
  const currentCurrency = displayCurrency || baseCurrency
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-cream-100 dark:hover:bg-dark-700 rounded-xl transition-colors text-sm font-semibold text-dark-800 dark:text-white"
        title="Change currency"
      >
        {currentCurrency}
        <CaretDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-24 bg-white dark:bg-dark-800 border border-cream-200 dark:border-brand-400/15 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            <div className="py-2">
              <button
                onClick={() => {
                  setDisplayCurrency(null) // Reset to base currency
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  !displayCurrency ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-500 font-bold' : 'text-dark-800 dark:text-white hover:bg-cream-50 dark:hover:bg-dark-700'
                }`}
              >
                {baseCurrency}
              </button>
              {CURRENCIES.filter(c => c !== baseCurrency).map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setDisplayCurrency(c)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    displayCurrency === c ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-500 font-bold' : 'text-dark-800 dark:text-white hover:bg-cream-50 dark:hover:bg-dark-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
