import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { activeFlashSalePrice } from '../../lib/utils'
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter'
import type { Product } from '../../types'

const PLACEHOLDER = 'https://placehold.co/600x750/1a1008/d4820a?text=No+Image'

/**
 * Auto-advancing single-product showcase for the hero. Crossfades through a
 * handful of products (image + name + price) and links to the active one.
 * Pauses for reduced-motion users.
 */
export default function HeroShowcase({ products }: { products: Product[] }) {
  const formatPrice = useCurrencyFormatter()
  const reduceMotion = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const items = products.slice(0, 6)

  useEffect(() => {
    if (items.length <= 1 || reduceMotion) return
    const id = window.setInterval(() => setIdx(i => (i + 1) % items.length), 3800)
    return () => window.clearInterval(id)
  }, [items.length, reduceMotion])

  if (items.length === 0) return null
  const active = items[idx] ?? items[0]
  const price = activeFlashSalePrice(active) ?? active.selling_price

  return (
    <div className="w-full max-w-[20rem] sm:max-w-sm mx-auto lg:mx-0 lg:ml-auto">
      <Link
        to={`/product/${active.id}`}
        className="group relative block aspect-[4/5] rounded-[1.75rem] overflow-hidden ring-1 ring-white/15 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.65)]"
      >
        {items.map((p, i) => (
          <img
            key={p.id}
            src={p.images?.[0] || PLACEHOLDER}
            alt={p.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out group-hover:scale-[1.03] ${
              i === idx ? 'opacity-100' : 'opacity-0'
            }`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-white/65 text-[10px] uppercase tracking-[0.28em] mb-1.5 truncate">
            {active.category || 'Featured'}
          </p>
          <h3 className="text-white font-display text-lg sm:text-xl leading-tight line-clamp-1">
            {active.title}
          </h3>
          <p className="text-white font-semibold mt-1">{formatPrice(price)}</p>
        </div>
      </Link>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Show item ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-6 bg-[var(--hero-accent)]' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
