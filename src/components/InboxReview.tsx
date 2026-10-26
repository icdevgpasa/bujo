import { useEffect, useState } from 'preact/hooks'
import { addDays, dayKey, monthKey } from '../dates'
import { db, deleteEntry, moveEntry } from '../db'
import { plural } from '../plural'
import { useLiveQuery } from '../useLiveQuery'
import { BULLET } from './bullets'
import { Sheet } from './Sheet'

// Thoughts dropped into the inbox, waiting to be given a day (or let go).
export function InboxReview() {
  const items = useLiveQuery(() => db.entries.where('[log+key]').equals(['inbox', 'inbox']).sortBy('createdAt'), [])
  const [open, setOpen] = useState(false)
  // Close the sheet once the last thought has found its place.
  useEffect(() => {
    if (open && items?.length === 0) setOpen(false)
  }, [open, items?.length])

  if (!items?.length) return null
  const today = dayKey()
  const n = items.length

  return (
    <>
      <button type="button" class="banner quiet" onClick={() => setOpen(true)}>
        💭 W zrzucie z głowy {n === 1 ? 'czeka 1 myśl' : `${plural(n, 'czeka', 'czekają', 'czeka')} ${n} ${plural(n, 'myśl', 'myśli', 'myśli')}`}
        <span class="banner-cta">Rozłóż na dni</span>
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Zrzut z głowy">
          <p class="sheet-title">Gdzie to położyć?</p>
          <ul class="migration">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <span class="task">{BULLET[item.type]} {item.text}</span>
                </div>
                <div class="row">
                  <button type="button" onClick={() => moveEntry(item.id, 'daily', today)}>Dziś</button>
                  <button type="button" onClick={() => moveEntry(item.id, 'daily', addDays(today, 1))}>Jutro</button>
                  <button type="button" title="Do tego miesiąca, bez konkretnego dnia" onClick={() => moveEntry(item.id, 'monthly', monthKey())}>Miesiąc</button>
                  <button type="button" title="Usuń tę myśl" onClick={() => deleteEntry(item.id)}>Usuń</button>
                </div>
              </li>
            ))}
          </ul>
          <div class="actions">
            <button type="button" onClick={() => setOpen(false)}>Zamknij</button>
          </div>
        </Sheet>
      )}
    </>
  )
}
