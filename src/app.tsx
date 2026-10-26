import { useState } from 'preact/hooks'
import { addEntry, db, setStatus, todayKey, type Entry, type EntryType } from './db'
import { useLiveQuery } from './useLiveQuery'

const BULLET: Record<EntryType, string> = { task: '•', event: '○', note: '–' }
const STATUS_MARK: Partial<Record<Entry['status'], string>> = {
  done: '×',
  migrated: '>',
  scheduled: '<',
}

export function App() {
  const key = todayKey()
  const entries = useLiveQuery(
    () => db.entries.where('[log+key]').equals(['daily', key]).sortBy('createdAt'),
    [key],
  )
  const [text, setText] = useState('')
  const [type, setType] = useState<EntryType>('task')

  const submit = async (e: Event) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    await addEntry('daily', key, type, value)
    setText('')
  }

  const toggle = (entry: Entry) => {
    if (entry.type !== 'task') return
    setStatus(entry.id, entry.status === 'done' ? 'open' : 'done')
  }

  const title = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main class="page">
      <h1>{title}</h1>
      <ul class="log">
        {entries?.map((entry) => (
          <li key={entry.id} class={`entry ${entry.type} ${entry.status}`} onClick={() => toggle(entry)}>
            <span class="bullet">{STATUS_MARK[entry.status] ?? BULLET[entry.type]}</span>
            <span class="text">{entry.text}</span>
          </li>
        ))}
      </ul>
      <form class="composer" onSubmit={submit}>
        <div class="types" role="radiogroup" aria-label="Rodzaj wpisu">
          {(Object.keys(BULLET) as EntryType[]).map((t) => (
            <button
              type="button"
              role="radio"
              aria-checked={type === t}
              class={type === t ? 'active' : ''}
              onClick={() => setType(t)}
              title={{ task: 'Zadanie', event: 'Wydarzenie', note: 'Notatka' }[t]}
            >
              {BULLET[t]}
            </button>
          ))}
        </div>
        <input
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          placeholder="Nowy wpis…"
          aria-label="Treść wpisu"
        />
      </form>
    </main>
  )
}
