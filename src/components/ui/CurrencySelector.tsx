import { useCurrencyStore } from '../../store/currencyStore'
import { useStoreSettings } from '../../hooks/useStoreSettings'

const CURRENCY_DETAILS: Record<string, { symbol: string; flag: string; label: string }> = {
  GHS: { symbol: 'GH₵', flag: '🇬🇭', label: 'Ghanaian Cedi' },
  USD: { symbol: '$', flag: '🇺🇸', label: 'US Dollar' },
  GBP: { symbol: '£', flag: '🇬🇧', label: 'British Pound' },
  EUR: { symbol: '€', flag: '🇪🇺', label: 'Euro' },
  NGN: { symbol: '₦', flag: '🇳🇬', label: 'Nigerian Naira' },
  KES: { symbol: 'KSh', flag: '🇰🇪', label: 'Kenyan Shilling' },
  ZAR: { symbol: 'R', flag: '🇿🇦', label: 'South African Rand' },
}

const CURRENCIES = ['GHS', 'USD', 'GBP', 'EUR', 'NGN', 'KES', 'ZAR']

export default function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyStore()
  const settings = useStoreSettings()
  const baseCurrency = settings?.currency || 'GHS'
  
  const currentCurrency = displayCurrency || baseCurrency

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-2">
      {CURRENCIES.map(code => {
        const details = CURRENCY_DETAILS[code] || { symbol: code, flag: '🏳️', label: code }
        const isSelected = currentCurrency === code
        const isBase = code === baseCurrency

        return (
          <button
            key={code}
            type="button"
            onClick={() => setDisplayCurrency(isBase ? null : code)}
            className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
              isSelected
                ? 'bg-brand-400/10 border-brand-400 text-brand-600 dark:text-brand-400 font-semibold shadow-sm'
                : 'bg-cream-50/50 dark:bg-dark-900/30 border-cream-200 dark:border-white/5 text-dark-800 dark:text-white hover:bg-cream-100/50 dark:hover:bg-dark-700/30'
            }`}
          >
            <span className="text-2xl flex-shrink-0" role="img" aria-label={details.label}>
              {details.flag}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight">{code}</span>
                <span className="text-xs text-dark-800/40 dark:text-white/40 font-mono font-bold">({details.symbol})</span>
              </div>
              <p className="text-[10px] text-dark-800/55 dark:text-white/40 truncate mt-0.5 font-medium">
                {details.label} {isBase ? '(Store Base)' : ''}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
