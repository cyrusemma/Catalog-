import { create } from 'zustand'

export type ColorTheme = 'golden' | 'rose' | 'turquoise' | 'aurora'
export type Mode = 'light' | 'dark' | 'system'

export const COLOR_THEMES: { value: ColorTheme; label: string; swatchClass: string; subtitle: string; primaryHex: string }[] = [
  { value: 'golden', label: 'Golden Brown', swatchClass: 'bg-gradient-to-br from-[#f4d48e] to-[#b86d08]', subtitle: 'Warm amber', primaryHex: '#d4820a' },
  { value: 'rose', label: 'Rose', swatchClass: 'bg-gradient-to-br from-[#f7c3d0] to-[#b54a73]', subtitle: 'Dusty rose', primaryHex: '#b54a73' },
  { value: 'turquoise', label: 'Turquoise', swatchClass: 'bg-gradient-to-br from-[#9fe8df] to-[#0c8577]', subtitle: 'Cool aqua', primaryHex: '#0c8577' },
  { value: 'aurora', label: 'Pastel Pasture', swatchClass: 'bg-gradient-to-b from-[#8bcdec] via-[#f0cbe1] to-[#a9e29a]', subtitle: 'Pastel gradient', primaryHex: '#8bcdec' },
]

const COLOR_KEY = 'catalog-color'
const MODE_KEY = 'catalog-mode'
const LEGACY_KEY = 'catalog-theme'

const THEME_META_COLORS: Record<ColorTheme, { light: string; dark: string }> = {
  golden: { light: '#fdfbf7', dark: '#0f0a05' },
  rose: { light: '#fff5f7', dark: '#1e0e14' },
  turquoise: { light: '#f0fdfa', dark: '#071f1c' },
  aurora: { light: '#f8fbff', dark: '#0c151c' },
}

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

export function resolveEffectiveMode(mode: Mode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }
  return mode
}

function classFor(color: ColorTheme, mode: 'light' | 'dark'): string {
  if (color === 'golden') return mode === 'dark' ? 'theme-dark' : 'theme-light'
  return `theme-${color}-${mode}`
}

export function applyTheme(color: ColorTheme, mode: Mode) {
  if (typeof document === 'undefined') return
  const effectiveMode = resolveEffectiveMode(mode)
  const root = document.documentElement
  root.classList.toggle('dark', effectiveMode === 'dark')
  const target = classFor(color, effectiveMode)
  for (const c of ALL_THEME_CLASSES) root.classList.toggle(c, c === target)

  // Sync mobile browser status bar and notch color
  const metaColor = THEME_META_COLORS[color]?.[effectiveMode] || (effectiveMode === 'dark' ? '#0f0a05' : '#fdfbf7')
  let metaTheme = document.querySelector('meta[name="theme-color"]')
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.setAttribute('name', 'theme-color')
    document.head.appendChild(metaTheme)
  }
  metaTheme.setAttribute('content', metaColor)
}

const isColor = (v: unknown): v is ColorTheme => v === 'golden' || v === 'rose' || v === 'turquoise' || v === 'aurora'
const isMode = (v: unknown): v is Mode => v === 'light' || v === 'dark' || v === 'system'

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
  toggleMode: () => {
    const currentEffective = resolveEffectiveMode(get().mode)
    const nextMode: Mode = currentEffective === 'dark' ? 'light' : 'dark'
    get().setMode(nextMode)
  },
}))

// Real-time OS System theme change listener
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    const { color, mode } = useThemeStore.getState()
    if (mode === 'system') {
      applyTheme(color, 'system')
    }
  }
  if (mql.addEventListener) {
    mql.addEventListener('change', handler)
  } else if ('addListener' in mql) {
    // Legacy Safari fallback
    (mql as any).addListener(handler)
  }
}
