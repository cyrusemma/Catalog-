import { useEffect, useRef, useState } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore, resolveEffectiveMode } from '../../store/themeStore'
import { toast } from 'sonner'

const THEME_HINT_KEY = 'catalog-theme-gesture-hint-seen'

/**
 * Navbar light/dark toggle. Flips only the mode of the currently selected
 * colour theme (the colour itself is chosen in Settings).
 * Long-press cycles through the available colour themes.
 */
export default function ThemeToggle() {
  const mode = useThemeStore(s => s.mode)
  const toggleMode = useThemeStore(s => s.toggleMode)
  const color = useThemeStore(s => s.color)
  const setColor = useThemeStore(s => s.setColor)
  const effectiveMode = resolveEffectiveMode(mode)
  const isDark = effectiveMode === 'dark'

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(THEME_HINT_KEY) === 'true') return
    const timer = window.setTimeout(() => setShowHint(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  const themeLabels: Record<string, string> = {
    golden: 'Golden Brown',
    rose: 'Rose',
    turquoise: 'Turquoise',
    aurora: 'Pastel Pasture',
  }

  const startPress = () => {
    setShowHint(false)
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      const themes: ('golden' | 'rose' | 'turquoise' | 'aurora')[] = ['golden', 'rose', 'turquoise', 'aurora']
      const currentIdx = themes.indexOf(color)
      const nextIdx = (currentIdx + 1) % themes.length
      const nextTheme = themes[nextIdx]
      setColor(nextTheme)
      toast.success(`Theme: ${themeLabels[nextTheme]} ✨`, { duration: 1500 })
    }, 600)
  }

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    localStorage.setItem(THEME_HINT_KEY, 'true')
    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    toggleMode()
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88 }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 active:bg-brand-400/20 transition-colors text-dark-800 dark:text-white relative overflow-visible"
      title={
        mode === 'system'
          ? `Theme: System (${isDark ? 'Dark' : 'Light'}) • Tap to toggle • Long-press to switch palette`
          : `Theme: ${isDark ? 'Dark' : 'Light'} • Tap to toggle • Long-press to switch palette`
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'dark' : 'light'}
          initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun size={18} weight="duotone" className="text-amber-400" />
          ) : (
            <Moon size={18} weight="duotone" className="text-dark-800 dark:text-white" />
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {showHint && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-[1.35rem] border border-white/65 bg-white/35 px-3.5 py-3 text-left shadow-[0_16px_40px_rgba(80,52,24,0.16),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/15 dark:bg-white/[0.08] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
          >
            <span className="absolute -inset-x-10 -top-8 h-14 rotate-[-12deg] bg-gradient-to-r from-transparent via-white/55 to-transparent blur-md dark:via-white/15" />
            <span className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-white/65 bg-white/45 backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.08]" />
            <span className="relative block text-[11px] font-bold text-dark-800 dark:text-white">
              Theme shortcut
            </span>
            <span className="relative mt-1 block text-[10px] leading-relaxed text-dark-800/65 dark:text-white/65">
              Tap to switch light/dark. Hold to change the colour theme.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
