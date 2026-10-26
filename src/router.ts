import { useEffect, useState } from 'preact/hooks'
import { dayKey, monthKey } from './dates'

export type Route =
  | { view: 'day'; key: string }
  | { view: 'month'; key: string }
  | { view: 'future' }

export function parseRoute(hash: string): Route {
  const [, view, key] = hash.replace(/^#/, '').split('/')
  if (view === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(key)) return { view, key }
  if (view === 'month' && /^\d{4}-\d{2}$/.test(key)) return { view, key }
  if (view === 'future') return { view }
  return { view: 'day', key: dayKey() }
}

export const href = {
  day: (key = dayKey()) => `#/day/${key}`,
  month: (key = monthKey()) => `#/month/${key}`,
  future: () => '#/future',
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash))
    addEventListener('hashchange', onChange)
    return () => removeEventListener('hashchange', onChange)
  }, [])
  return route
}
