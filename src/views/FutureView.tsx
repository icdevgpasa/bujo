import { useState } from 'preact/hooks'
import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { addMonths, formatMonth, monthKey } from '../dates'
import { addEntry, db, type Entry } from '../db'
import { useLiveQuery } from '../useLiveQuery'

const MONTHS_AHEAD = 6

export function FutureView() {
  const first = addMonths(monthKey(), 1)
  const months = Array.from({ length: MONTHS_AHEAD }, (_, i) => addMonths(first, i))
  const [target, setTarget] = useState(first)
  // Everything from next month on, so entries planned further ahead still show up.
  const entries = useLiveQuery(() => db.entries.where('[log+key]').between(['future', first], ['future', '9999-12'], true, true).sortBy('createdAt'), [first])

  const byMonth = new Map<string, Entry[]>(months.map((m) => [m, []]))
  for (const e of entries ?? []) {
    if (!byMonth.has(e.key)) byMonth.set(e.key, [])
    byMonth.get(e.key)!.push(e)
  }
  const keys = [...byMonth.keys()].sort()

  return (
    <>
      <header class="page-header">
        <h1>Przyszły log</h1>
      </header>
      {keys.map((m) => (
        <section key={m} class="future-month">
          <h2>{formatMonth(m)}</h2>
          <EntryList entries={byMonth.get(m)} />
        </section>
      ))}
      <Composer
        here={{ log: 'future', key: target }}
        onSubmit={(type, text, media, to) => addEntry(to?.log ?? 'future', to?.key ?? target, type, text, media)}
      >
        <div class="chips" role="radiogroup" aria-label="Miesiąc">
          {months.map((m) => (
            <button type="button" role="radio" aria-checked={m === target} class={`chip ${m === target ? 'active' : ''}`} onClick={() => setTarget(m)}>
              {formatMonth(m, false)}
            </button>
          ))}
        </div>
      </Composer>
    </>
  )
}
