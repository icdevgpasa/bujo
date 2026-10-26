// Polish counts: 1 wpis, 2–4 wpisy (but 12–14 wpisów), 5+ wpisów.
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const last = n % 10
  const teens = n % 100 >= 12 && n % 100 <= 14
  return last >= 2 && last <= 4 && !teens ? few : many
}
