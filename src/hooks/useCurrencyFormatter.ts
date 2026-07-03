import { useCallback, useEffect } from 'react'
import { useCurrencyStore } from '../store/currencyStore'
import { useStoreSettings } from './useStoreSettings'
import { getCurrencySymbol } from '../lib/utils'

export function useCurrencyFormatter() {
  const { displayCurrency, exchangeRates, fetchRates } = useCurrencyStore()
  const settings = useStoreSettings()

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  const formatPrice = useCallback((amount: number, overrideBaseCurrency?: string) => {
    let finalAmount = amount
    // If no explicit base currency is provided, default to the store's currency, or GHS
    const baseCurrency = overrideBaseCurrency || settings.currency || 'GHS'
    let finalCurrency = baseCurrency

    // Convert if a different display currency is selected and rates are available
    if (displayCurrency && exchangeRates && displayCurrency !== baseCurrency) {
      const baseRate = exchangeRates[baseCurrency]
      const targetRate = exchangeRates[displayCurrency]

      if (baseRate && targetRate) {
        // Convert to USD first (base of the API), then to the target currency
        const amountInUSD = amount / baseRate
        finalAmount = amountInUSD * targetRate
        finalCurrency = displayCurrency
      }
    }

    return `${getCurrencySymbol(finalCurrency)} ${finalAmount.toFixed(2)}`
  }, [displayCurrency, exchangeRates, settings.currency])

  return formatPrice
}
