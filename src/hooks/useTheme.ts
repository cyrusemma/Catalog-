import { useEffect, useState, useCallback } from 'react'

export type Theme =
  | 'light'
  | 'dark'
  | 'amoled'
  | 'rose-light'
  | 'rose-dark'
  | 'turquoise-light'
  | 'turquoise-dark'

const STORAGE_KEY = 'catalog-theme'
const THEME_ORDER: Theme[] = [
  'light',
  'dark',
  'amoled',
  'rose-light',
  'rose-dark',
  'turquoise-light',
  'turquoise-dark',
]

export const THEMES: { value: Theme; label: string; swatch: string; subtitle: string }[] = [
  { value: 'light', label: 'Light', swatch: 'linear-gradient(135deg, #faecc6, #f0dfae)', subtitle: 'Bright cream' },
  { value: 'dark', label: 'Dark', swatch: 'linear-gradient(135deg, #1a1008, #0f0a05)', subtitle: 'Warm brown' },
  { value: 'amoled', label: 'AMOLED', swatch: 'linear-gradient(135deg, #050505, #000000)', subtitle: 'Pure black' },
  { value: 'rose-light', label: 'Rose Light', swatch: 'linear-gradient(135deg, #fde4ea, #f7c3d0)', subtitle: 'Soft dusty rose' },
  { value: 'rose-dark', label: 'Rose Dark', swatch: 'linear-gradient(135deg, #3a1a25, #1c0a12)', subtitle: 'Deep wine rose' },
  { value: 'turquoise-light', label: 'Turquoise Light', swatch: 'linear-gradient(135deg, #d6f7f1, #9fe8df)', subtitle: 'Cool aqua' },
  { value: 'turquoise-dark', label: 'Turquoise Dark', swatch: 'linear-gradient(135deg, #0a3f38, #03201c)', subtitle: 'Deep teal' },
]

function isTheme(v: unknown): v is Theme {
  return typeof v === 'string' && (THEME_ORDER as string[]).includes(v)
}

function detectInitial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isTheme(stored)) return stored
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

/**
 * Two-axis theme: `.dark` controls whether dark Tailwind utilities apply, and
 * `.theme-<name>` carries the per-theme overrides defined in index.css.
 * Every theme except `light` and `rose-light` carries the `.dark` class so
 * existing `dark:` utilities keep their behaviour without any rewrites.
 */
export function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  const isDarkVariant =
    theme === 'dark' || theme === 'amoled' || theme === 'rose-dark' || theme === 'turquoise-dark'
  root.classList.toggle('dark', isDarkVariant)
  for (const name of THEME_ORDER) {
    root.classList.toggle(`theme-${name}`, theme === name)
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(detectInitial)

  useEffect(() => {
    applyThemeClass(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Cycle preserved so the existing one-button callsite still works, but most
  // UI should call setTheme directly from a picker since the cycle through 5
  // options gets confusing fast.
  const toggle = useCallback(() => {
    setTheme(t => THEME_ORDER[(THEME_ORDER.indexOf(t) + 1) % THEME_ORDER.length])
  }, [])

  return { theme, toggle, setTheme }
}
