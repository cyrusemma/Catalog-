import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CurrencyState {
  displayCurrency: string | null
  exchangeRates: Record<string, number> | null
  lastFetched: number | null
  setDisplayCurrency: (currency: string | null) => void
  fetchRates: () => Promise<void>
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      displayCurrency: null,
      exchangeRates: null,
      lastFetched: null,
      setDisplayCurrency: (currency) => set({ displayCurrency: currency }),
      fetchRates: async () => {
        const { lastFetched } = get()
        const now = Date.now()
        // Cache rates for 24 hours
        if (lastFetched && now - lastFetched < 24 * 60 * 60 * 1000) {
          return
        }

        try {
          // Free API, no key required. Updates every 24h.
          const res = await fetch('https://open.er-api.com/v6/latest/USD')
          if (!res.ok) throw new Error('Failed to fetch exchange rates')
          const data = await res.json()
          if (data && data.rates) {
            set({ exchangeRates: data.rates, lastFetched: now })
          }
        } catch (error) {
          console.error('Failed to fetch exchange rates:', error)
        }
      },
    }),
    {
      name: 'currency-storage',
    }
  )
)
