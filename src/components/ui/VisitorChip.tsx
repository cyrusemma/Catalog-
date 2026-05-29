import { Eye } from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useStoreSettings } from '../../hooks/useStoreSettings'
import { useVisitorCount } from '../../hooks/useVisitorCount'

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

/**
 * Floating "N visited" chip pinned bottom-right. Only renders when the admin
 * has flipped `show_visitor_count` on in store settings — otherwise the count
 * is fetched but the component returns null, so private stores stay private.
 */
export default function VisitorChip() {
  const settings = useStoreSettings()
  const { data: count } = useVisitorCount(settings.show_visitor_count)

  if (!settings.show_visitor_count) return null

  const display = formatCount(count ?? 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      // Sits above the mobile bottom-nav on small screens, hugs the corner on desktop.
      className="fixed right-3 sm:right-5 bottom-20 lg:bottom-5 z-30 select-none"
      role="status"
      aria-label={`${(count ?? 0).toLocaleString()} visitors so far`}
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 dark:bg-dark-800/85 backdrop-blur-xl border border-cream-200 dark:border-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] text-dark-800 dark:text-white text-xs font-semibold">
        <Eye size={13} weight="fill" className="text-brand-400" />
        <span className="tabular-nums">{display}</span>
      </div>
    </motion.div>
  )
}
