export type Theme = 'paper' | 'modern'

const KEY = 'bujo:theme'
// Matches the page background, so the iPhone status bar blends in.
const BAR_COLOR: Record<Theme, string> = { paper: '#f3efe4', modern: '#f3f4f6' }

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'modern' ? 'modern' : 'paper'
}

// A per-phone preference, so it lives in localStorage and not in the backup.
// index.html applies it before the first paint.
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BAR_COLOR[theme])
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Blocked storage: the choice lasts until the app is closed.
  }
}
