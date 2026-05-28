import { Link } from 'react-router-dom'
import { Clock, Lightning } from '@phosphor-icons/react'
import { activeFlashSalePrice, formatPrice } from '../../lib/utils'
import type { Product } from '../../types'

interface Props {
  products: Product[]
  /** Seconds for one full loop. Lower = faster. */
  durationSeconds?: number
}

/**
 * A continuously auto-scrolling row of product tiles. Renders the list twice so
 * the CSS translateX(-50%) loop is seamless; the second copy is hidden from
 * assistive tech. Pauses on hover/focus and is disabled under reduced-motion.
 */
export default function ProductMarquee({ products, durationSeconds = 45 }: Props) {
  if (!products || products.length === 0) return null

  const tile = (product: Product, key: string, ariaHidden: boolean) => {
    const flashPrice = activeFlashSalePrice(product)
    const onFlashSale = flashPrice != null
    const image = product.images?.[0] || 'https://placehold.co/400x400/1a1008/d4820a?text=No+Image'
    return (
      <Link
        key={key}
        to={`/product/${product.id}`}
        aria-hidden={ariaHidden}
        tabIndex={ariaHidden ? -1 : undefined}
        className="group relative flex-shrink-0 w-44 sm:w-52 card card-hover block"
      >
        <div className="relative aspect-square overflow-hidden bg-cream-100 dark:bg-dark-700">
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {onFlashSale && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lightning size={9} weight="fill" /> FLASH
              </span>
            )}
            {product.is_preorder && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock size={9} weight="fill" /> PREORDER
              </span>
            )}
          </div>
        </div>
        <div className="p-2.5 sm:p-3">
          <p className="text-cream-400 dark:text-white/50 uppercase tracking-wider mb-0.5 font-medium truncate text-[9px]">
            {product.category}
          </p>
          <h3 className="text-dark-800 dark:text-white font-medium leading-snug line-clamp-1 mb-1 group-hover:text-brand-400 transition-colors text-[13px] sm:text-sm">
            {product.title}
          </h3>
          <p className={`font-bold text-sm ${onFlashSale ? 'text-red-500' : 'text-brand-400'}`}>
            {formatPrice(flashPrice ?? product.selling_price)}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <div className="marquee-pause relative overflow-hidden">
      {/* Edge fades so tiles slide in/out softly */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10 bg-gradient-to-r from-cream-50 dark:from-dark-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10 bg-gradient-to-l from-cream-50 dark:from-dark-900 to-transparent" />
      <div
        className="animate-marquee flex gap-3 sm:gap-4 w-max"
        style={{ '--marquee-duration': `${durationSeconds}s` } as React.CSSProperties}
      >
        {products.map((p, i) => tile(p, `a-${p.id}-${i}`, false))}
        {products.map((p, i) => tile(p, `b-${p.id}-${i}`, true))}
      </div>
    </div>
  )
}
