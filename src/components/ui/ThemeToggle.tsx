import { Sun, Moon } from '@phosphor-icons/react'
import { useThemeStore } from '../../store/themeStore'

/**
 * Navbar light/dark toggle. Flips only the mode of the currently selected
 * colour theme (the colour itself is chosen in Settings).
 */
export default function ThemeToggle() {
  const mode = useThemeStore(s => s.mode)
  const toggleMode = useThemeStore(s => s.toggleMode)
  const isDark = mode === 'dark'

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-brand-400/10 transition-colors text-dark-800 dark:text-white"
    >
      {isDark ? <Sun size={18} weight="duotone" /> : <Moon size={18} weight="duotone" />}
    </button>
  )
}
