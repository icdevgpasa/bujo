import { addDays, addMonths, dayKey, formatMonth, monthKey, parseDay, weekdayShort } from './dates'
import { fold } from './db'

// Reads a date out of Polish text: "kupić jutro chleb" → "kupić chleb" for
// tomorrow. Plain rules, no model: it runs offline and instantly.

export interface When {
  log: 'daily' | 'monthly' | 'future'
  key: string
  // The text with the date phrase taken out.
  text: string
  // Short description for the hint, e.g. "wt 27.10" or "listopad 2026".
  label: string
}

const L = '\\p{L}'
const before = `(?<![${L}\\d])`
const after = `(?![${L}])`

// Folded (no Polish letters, lower case) stems; Monday = 0.
const WEEKDAYS: [string, number][] = [
  ['poniedzialek|poniedzialku', 0],
  ['wtorek|wtorku', 1],
  ['srod[aey]|srodzie', 2],
  ['czwartek|czwartku', 3],
  ['piatek|piatku', 4],
  ['sobot[aey]|sobocie', 5],
  ['niedziel[aei]|niedzieli', 6],
]
const GENITIVE_MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'wrzesnia', 'pazdziernika', 'listopada', 'grudnia']
const LOCATIVE_MONTHS = ['styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrzesniu', 'pazdzierniku', 'listopadzie', 'grudniu']
const NUMBERS: Record<string, number> = { jeden: 1, dwa: 2, trzy: 3, cztery: 4, piec: 5, szesc: 6, siedem: 7, osiem: 8, dziewiec: 9, dziesiec: 10 }
const NUM = `(\\d{1,2}|${Object.keys(NUMBERS).join('|')})`

const toNumber = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBERS[s])
const weekdayOf = (key: string) => (parseDay(key).getDay() + 6) % 7

// A day this year, or next year once it has passed.
function upcoming(today: string, month: number, day: number, year?: number): string | undefined {
  const y = year ?? Number(today.slice(0, 4))
  const d = new Date(y, month - 1, day)
  if (d.getMonth() !== month - 1) return undefined
  const key = dayKey(d)
  return year === undefined && key < today ? dayKey(new Date(y + 1, month - 1, day)) : key
}

type Rule = [RegExp, (m: RegExpMatchArray, today: string) => Pick<When, 'log' | 'key'> | undefined]

const daily = (key: string | undefined) => (key ? { log: 'daily' as const, key } : undefined)
const month = (today: string, key: string) => ({ log: key === monthKey(parseDay(today)) ? ('monthly' as const) : ('future' as const), key })

// "na jutro", "w piątek": the preposition goes with the date.
const prep = '(?:(?:na|w|we|do)\\s+)?'

const RULES: Rule[] = [
  [new RegExp(`${before}${prep}(?:dzisiaj|dzis)${after}`, 'u'), (_, t) => daily(t)],
  [new RegExp(`${before}${prep}pojutrze${after}`, 'u'), (_, t) => daily(addDays(t, 2))],
  [new RegExp(`${before}${prep}jutro${after}`, 'u'), (_, t) => daily(addDays(t, 1))],
  [new RegExp(`${before}za\\s+${NUM}\\s+(?:dzien|dni)${after}`, 'u'), (m, t) => daily(addDays(t, toNumber(m[1])))],
  [new RegExp(`${before}za\\s+tydzien${after}`, 'u'), (_, t) => daily(addDays(t, 7))],
  [new RegExp(`${before}za\\s+${NUM}\\s+tygodni[ea]?${after}`, 'u'), (m, t) => daily(addDays(t, 7 * toNumber(m[1])))],
  [new RegExp(`${before}${prep}(?:przyszlym|nastepnym)\\s+tygodniu${after}`, 'u'), (_, t) => daily(addDays(t, 7 - weekdayOf(t)))],
  [new RegExp(`${before}${prep}(?:przyszlym|nastepnym)\\s+miesiacu${after}`, 'u'), (_, t) => month(t, addMonths(monthKey(parseDay(t)), 1))],
  // "15 listopada", "15 listopada 2027"
  [
    new RegExp(`${before}${prep}(\\d{1,2})\\s+(${GENITIVE_MONTHS.join('|')})(?:\\s+(\\d{4}))?${after}`, 'u'),
    (m, t) => daily(upcoming(t, GENITIVE_MONTHS.indexOf(m[2]) + 1, Number(m[1]), m[3] ? Number(m[3]) : undefined)),
  ],
  // "15.11", "15/11/2027"
  [
    new RegExp(`${before}${prep}(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{4}))?(?![\\d./])`, 'u'),
    (m, t) => daily(upcoming(t, Number(m[2]), Number(m[1]), m[3] ? Number(m[3]) : undefined)),
  ],
  // "w listopadzie"
  [
    new RegExp(`${before}w\\s+(${LOCATIVE_MONTHS.join('|')})${after}`, 'u'),
    (m, t) => {
      const target = LOCATIVE_MONTHS.indexOf(m[1]) + 1
      const now = parseDay(t)
      const year = target < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear()
      return month(t, `${year}-${String(target).padStart(2, '0')}`)
    },
  ],
  // "w przyszły piątek": that day in next week
  ...WEEKDAYS.map(
    ([names, wd]): Rule => [
      new RegExp(`${before}${prep}(?:przyszly|przyszla|nastepny|nastepna)\\s+(?:${names})${after}`, 'u'),
      (_, t) => daily(addDays(t, 7 - weekdayOf(t) + wd)),
    ],
  ),
  // "w piątek": the next one after today
  ...WEEKDAYS.map(
    ([names, wd]): Rule => [
      new RegExp(`${before}${prep}(?:${names})${after}`, 'u'),
      (_, t) => daily(addDays(t, ((wd - weekdayOf(t) + 6) % 7) + 1)),
    ],
  ),
]

function describe(log: When['log'], key: string): string {
  if (log === 'daily') {
    const d = parseDay(key)
    return `${weekdayShort(key)} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return formatMonth(key)
}

export function findWhen(text: string, today = dayKey()): When | undefined {
  const folded = fold(text)
  // Folding keeps one character per character for Polish text, so positions
  // line up; anything else (decomposed input) is left alone.
  if (folded.length !== text.length) return undefined
  for (const [pattern, resolve] of RULES) {
    const m = folded.match(pattern)
    if (!m || m.index === undefined) continue
    const target = resolve(m, today)
    if (!target) continue
    const rest = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length))
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return { ...target, text: rest, label: describe(target.log, target.key) }
  }
  return undefined
}

const SETTING_KEY = 'bujo:smartDates'

export function smartDatesOn(): boolean {
  try {
    return localStorage.getItem(SETTING_KEY) === '1'
  } catch {
    return false
  }
}

export function setSmartDates(on: boolean) {
  try {
    if (on) localStorage.setItem(SETTING_KEY, '1')
    else localStorage.removeItem(SETTING_KEY)
  } catch {
    // Blocked storage: the switch just doesn't stick.
  }
}
