import { useEffect, useRef, useState } from 'react'
import { Palette, Check } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { THEMES, useTheme } from '../../hooks/useTheme'

/**
 * Five themes is too many for a single cycle button, so this exposes them as
 * a small popover with colour swatches. Clicking outside closes it.
 */
export default function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click + Escape so it feels like a real menu, not a
  // sticky overlay.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Theme: ${theme}. Open theme picker.`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
      >
        <Palette size={18} weight="duotone" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="menu"
            className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-cream-200 dark:border-white/10 bg-white/95 dark:bg-dark-800/95 backdrop-blur-2xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)] p-2"
          >
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-dark-800/50 dark:text-white/40">
              Theme
            </p>
            <div className="space-y-1">
              {THEMES.map(t => {
                const active = t.value === theme
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setTheme(t.value); setOpen(false) }}
                    role="menuitemradio"
                    aria-checked={active}
                    className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      active
                        ? 'bg-brand-400/10 ring-1 ring-brand-400/30'
                        : 'hover:bg-brand-400/5'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex-shrink-0 w-7 h-7 rounded-lg ring-1 ring-black/10 dark:ring-white/10"
                      style={{ background: t.swatch }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-dark-800 dark:text-white truncate">
                        {t.label}
                      </span>
                      <span className="block text-[11px] text-dark-800/50 dark:text-white/40 truncate">
                        {t.subtitle}
                      </span>
                    </span>
                    {active && <Check size={14} weight="bold" className="text-brand-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
