import { create } from 'zustand'

export type ColorTheme = 'golden' | 'rose' | 'turquoise' | 'aurora'
export type Mode = 'light' | 'dark'

export const COLOR_THEMES: { value: ColorTheme; label: string; swatchClass: string; subtitle: string }[] = [
  { value: 'golden', label: 'Golden Brown', swatchClass: 'bg-gradient-to-br from-[#f4d48e] to-[#b86d08]', subtitle: 'Warm amber' },
  { value: 'rose', label: 'Rose', swatchClass: 'bg-gradient-to-br from-[#f7c3d0] to-[#b54a73]', subtitle: 'Dusty rose' },
  { value: 'turquoise', label: 'Turquoise', swatchClass: 'bg-gradient-to-br from-[#9fe8df] to-[#0c8577]', subtitle: 'Cool aqua' },
  { value: 'aurora', label: 'Pastel Pasture', swatchClass: 'bg-gradient-to-b from-[#8bcdec] via-[#f0cbe1] to-[#a9e29a]', subtitle: 'Pastel gradient' },
]

const COLOR_KEY = 'catalog-color'
const MODE_KEY = 'catalog-mode'
const LEGACY_KEY = 'catalog-theme'

// Golden maps onto the original light/dark classes; rose and turquoise have
// their own `theme-<color>-<mode>` overrides in index.css.
const ALL_THEME_CLASSES = [
  'theme-light',
  'theme-dark',
  'theme-rose-light',
  'theme-rose-dark',
  'theme-turquoise-light',
  'theme-turquoise-dark',
  'theme-aurora-light',
  'theme-aurora-dark',
]

function classFor(color: ColorTheme, mode: Mode): string {
  if (color === 'golden') return mode === 'dark' ? 'theme-dark' : 'theme-light'
  return `theme-${color}-${mode}`
}

export function applyTheme(color: ColorTheme, mode: Mode) {
  const root = document.documentElement
  root.classList.toggle('dark', mode === 'dark')
  const target = classFor(color, mode)
  for (const c of ALL_THEME_CLASSES) root.classList.toggle(c, c === target)
}

const isColor = (v: unknown): v is ColorTheme => v === 'golden' || v === 'rose' || v === 'turquoise' || v === 'aurora'
const isMode = (v: unknown): v is Mode => v === 'light' || v === 'dark'

// One-time migration from the old single-key theme ("rose-dark", "amoled", …).
function migrateLegacy() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(COLOR_KEY) || localStorage.getItem(MODE_KEY)) return
  const old = localStorage.getItem(LEGACY_KEY)
  if (!old) return
  const map: Record<string, [ColorTheme, Mode]> = {
    light: ['golden', 'light'],
    dark: ['golden', 'dark'],
    amoled: ['golden', 'dark'],
    'rose-light': ['rose', 'light'],
    'rose-dark': ['rose', 'dark'],
    'turquoise-light': ['turquoise', 'light'],
    'turquoise-dark': ['turquoise', 'dark'],
  }
  const next = map[old]
  if (next) {
    localStorage.setItem(COLOR_KEY, next[0])
    localStorage.setItem(MODE_KEY, next[1])
  }
  localStorage.removeItem(LEGACY_KEY)
}

export function initialColor(): ColorTheme {
  if (typeof window === 'undefined') return 'golden'
  migrateLegacy()
  const stored = localStorage.getItem(COLOR_KEY)
  return isColor(stored) ? stored : 'golden'
}

export function initialMode(): Mode {
  if (typeof window === 'undefined') return 'light'
  migrateLegacy()
  const stored = localStorage.getItem(MODE_KEY)
  if (isMode(stored)) return stored
  // Default to light mode — user can switch to dark via the toggle
  return 'light'
}

const SHORTCUT_KEY = 'catalog-show-dashboard-shortcut'

export function initialShortcut(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SHORTCUT_KEY) === 'true'
}

interface ThemeState {
  color: ColorTheme
  mode: Mode
  showDashboardShortcut: boolean
  setColor: (color: ColorTheme) => void
  setMode: (mode: Mode) => void
  setShowDashboardShortcut: (show: boolean) => void
  toggleMode: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  color: initialColor(),
  mode: initialMode(),
  showDashboardShortcut: initialShortcut(),
  setColor: (color) => {
    localStorage.setItem(COLOR_KEY, color)
    applyTheme(color, get().mode)
    set({ color })
  },
  setMode: (mode) => {
    localStorage.setItem(MODE_KEY, mode)
    applyTheme(get().color, mode)
    set({ mode })
  },
  setShowDashboardShortcut: (show) => {
    localStorage.setItem(SHORTCUT_KEY, show ? 'true' : 'false')
    set({ showDashboardShortcut: show })
  },
  toggleMode: () => get().setMode(get().mode === 'dark' ? 'light' : 'dark'),
}))
