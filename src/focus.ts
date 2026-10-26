// Optional helpers for staying on track (handy with ADHD). Each one is a
// per-phone switch on the Ustawienia page, off by default.

export const FOCUS = [
  {
    key: 'bujo:oneThing',
    label: 'Jedna rzecz naraz',
    hint: 'Na stronie dnia przycisk 🎯 pokazuje jedno zadanie na cały ekran. „Zrobione” albo „Nie teraz” i następne.',
  },
  {
    key: 'bujo:top3',
    label: 'Top 3 na dziś',
    hint: 'Gwiazdką ⭐ oznaczasz najwyżej 3 najważniejsze sprawy dnia (w menu wpisu). Reszta zwija się pod „Pozostałe”.',
  },
  {
    key: 'bujo:steps',
    label: 'Rozbij na kroki',
    hint: 'W menu zadania dopiszesz małe kroki, np. „posprzątać kuchnię” → naczynia, blat, podłoga. Odhaczasz je prosto z listy.',
  },
  {
    key: 'bujo:timer',
    label: 'Timer skupienia',
    hint: 'W menu zadania (i w „Jednej rzeczy”) przycisk ⏱ 10 lub 25 min. Na cały ekran odliczanie, na koniec dźwięk.',
  },
  {
    key: 'bujo:inbox',
    label: 'Zrzut z głowy',
    hint: 'Przycisk 💭 przy polu wpisu zapisuje myśl bez wybierania dnia. Na dzisiejszej stronie rozłożysz je potem na dni.',
  },
  {
    key: 'bujo:gentle',
    label: 'Poranne zaległości',
    hint: 'Raz dziennie samo otwiera się okienko z niezrobionymi zadaniami z poprzednich dni. Przy zadaniu przenoszonym kolejny raz zapyta, czy nadal jest ważne.',
  },
] as const
export type FocusKey = (typeof FOCUS)[number]['key']

export function focusOn(key: FocusKey): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function setFocus(key: FocusKey, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // Blocked storage: the switch lasts until the app closes.
  }
}

export const MAX_STARS = 3
