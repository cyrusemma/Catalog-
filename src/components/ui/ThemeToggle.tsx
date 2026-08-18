import { useRef } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'
import { useThemeStore } from '../../store/themeStore'
import { toast } from 'sonner'

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
  const isDark = mode === 'dark'

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)

  const themeLabels: Record<string, string> = {
    golden: 'Golden Brown',
    rose: 'Rose',
    turquoise: 'Turquoise',
    aurora: 'Pastel Pasture',
  }

  const startPress = () => {
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
    if (isLongPressRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    toggleMode()
  }

  return (
    <button
      type="button"
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
    >
      {isDark ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
    </button>
  )
}
