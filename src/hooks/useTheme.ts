import { useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'amoled'

const STORAGE_KEY = 'catalog-theme'
const THEME_ORDER: Theme[] = ['light', 'dark', 'amoled']

function detectInitial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark' || stored === 'amoled') return stored
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

/**
 * AMOLED layers on top of dark mode — both `.dark` and `.theme-amoled` go on
 * the root so every existing `dark:` Tailwind utility still applies, and a few
 * extra rules in index.css swap the warm dark-brown palette for pure black.
 */
export function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme !== 'light')
  root.classList.toggle('theme-amoled', theme === 'amoled')
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(detectInitial)

  useEffect(() => {
    applyThemeClass(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Three-way cycle: light → dark → amoled → light. Kept as `toggle` so the
  // single-button callsite in Navbar still works without a refactor.
  const toggle = useCallback(() => {
    setTheme(t => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length])
  }, [])

  return { theme, toggle, setTheme }
}
