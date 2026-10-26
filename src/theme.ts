export const THEMES = [
  { id: 'paper', label: 'Papierowy notes', bar: '#f3efe4', darkBar: '#1c2230' },
  { id: 'modern', label: 'Nowoczesny', bar: '#f3f4f6', darkBar: '#121418' },
  { id: 'squared', label: 'Zeszyt w kratkę', bar: '#fdfdfb', darkBar: '#141c2e' },
  { id: 'kraft', label: 'Kraft', bar: '#d6bc93', darkBar: '#2a2119' },
] as const
export type Theme = (typeof THEMES)[number]['id']
// Night mode works with every theme: off, on, or following the phone.
export type Dark = 'off' | 'on' | 'auto'

const KEY = 'bujo:theme'
const DARK_KEY = 'bujo:dark'
const phoneDark = matchMedia('(prefers-color-scheme: dark)')

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme
  return THEMES.find((x) => x.id === t)?.id ?? 'paper'
}

export function currentDark(): Dark {
  try {
    const d = localStorage.getItem(DARK_KEY)
    return d === 'on' || d === 'auto' ? d : 'off'
  } catch {
    return 'off'
  }
}

// Sets the page and the iPhone status bar, which matches the background.
function apply(theme: Theme, dark: Dark) {
  const root = document.documentElement
  const night = dark === 'on' || (dark === 'auto' && phoneDark.matches)
  root.dataset.theme = theme
  if (night) root.dataset.dark = ''
  else delete root.dataset.dark
  const t = THEMES.find((x) => x.id === theme)!
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? t.darkBar : t.bar)
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Blocked storage: the choice lasts until the app is closed.
  }
}

// Per-phone preferences, so they live in localStorage and not in the backup.
// index.html applies them before the first paint.
export function setTheme(theme: Theme) {
  apply(theme, currentDark())
  save(KEY, theme)
}

export function setDark(dark: Dark) {
  apply(currentTheme(), dark)
  save(DARK_KEY, dark)
}

phoneDark.addEventListener('change', () => {
  if (currentDark() === 'auto') apply(currentTheme(), 'auto')
})
