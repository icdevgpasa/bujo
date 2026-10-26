const pad = (n: number) => String(n).padStart(2, '0')

// Day keys are YYYY-MM-DD, month keys are YYYY-MM, both in local time.
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function parseMonth(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

export function addMonths(key: string, n: number): string {
  const d = parseMonth(key)
  d.setMonth(d.getMonth() + n)
  return monthKey(d)
}

export function daysOfMonth(key: string): string[] {
  const d = parseMonth(key)
  const count = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => `${key}-${pad(i + 1)}`)
}

export function formatDay(key: string): string {
  return parseDay(key).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
}

export function weekdayLong(key: string): string {
  return parseDay(key).toLocaleDateString('pl-PL', { weekday: 'long' })
}

export function formatMonth(key: string, withYear = true): string {
  return parseMonth(key).toLocaleDateString('pl-PL', withYear ? { month: 'long', year: 'numeric' } : { month: 'long' })
}

export function weekdayShort(key: string): string {
  return parseDay(key).toLocaleDateString('pl-PL', { weekday: 'short' }).replace('.', '')
}
