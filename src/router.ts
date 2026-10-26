import { useEffect, useRef, useState } from 'preact/hooks'
import { dayKey, monthKey } from './dates'

export type Route =
  | { view: 'day'; key: string }
  | { view: 'month'; key: string }
  | { view: 'future' }
  | { view: 'backup' }
  | { view: 'index' }
  | { view: 'collection'; id: number }

export function parseRoute(hash: string): Route {
  const [, view, key] = hash.replace(/^#/, '').split('/')
  if (view === 'day' && /^\d{4}-\d{2}-\d{2}$/.test(key)) return { view, key }
  if (view === 'month' && /^\d{4}-\d{2}$/.test(key)) return { view, key }
  if (view === 'future') return { view }
  if (view === 'backup') return { view }
  if (view === 'index') return { view }
  if (view === 'collection' && /^\d+$/.test(key)) return { view, id: Number(key) }
  return { view: 'day', key: dayKey() }
}

export const href = {
  day: (key = dayKey()) => `#/day/${key}`,
  month: (key = monthKey()) => `#/month/${key}`,
  future: () => '#/future',
  backup: () => '#/backup',
  index: () => '#/index',
  collection: (id: number) => `#/collection/${id}`,
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

export type Turn = 'next' | 'prev' | 'fade'

// Which way the page turns: forward or back within the same view (day keys
// and month keys both sort as strings), otherwise a plain fade between tabs.
export function useTurn(route: Route): Turn {
  const last = useRef<{ route: Route; turn: Turn }>({ route, turn: 'fade' })
  if (last.current.route !== route) {
    const from = last.current.route
    const turn: Turn =
      'key' in from && 'key' in route && from.view === route.view
        ? route.key > from.key
          ? 'next'
          : 'prev'
        : 'fade'
    last.current = { route, turn }
  }
  return last.current.turn
}
