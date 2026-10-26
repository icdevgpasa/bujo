export const THEMES = [
  { id: 'paper', label: 'Papierowy notes', bar: '#f3efe4' },
  { id: 'modern', label: 'Nowoczesny', bar: '#f3f4f6' },
  { id: 'squared', label: 'Zeszyt w kratkę', bar: '#fdfdfb' },
  { id: 'kraft', label: 'Kraft', bar: '#d6bc93' },
  { id: 'night', label: 'Nocny', bar: '#1c2230' },
] as const
export type Theme = (typeof THEMES)[number]['id']

const KEY = 'bujo:theme'

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme
  return THEMES.find((x) => x.id === t)?.id ?? 'paper'
}

// A per-phone preference, so it lives in localStorage and not in the backup.
// index.html applies it before the first paint.
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // Matches the page background, so the iPhone status bar blends in.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES.find((x) => x.id === theme)!.bar)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Blocked storage: the choice lasts until the app is closed.
  }
}
