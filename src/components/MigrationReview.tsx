import { useEffect, useState } from 'preact/hooks'
import { addMonths, dayKey, formatDay, monthKey } from '../dates'
import { migrateEntry, pendingTasks, updateEntry } from '../db'
import { useLiveQuery } from '../useLiveQuery'
import { Sheet } from './Sheet'

// Daily ritual: decide what to do with every task still open from earlier days.
export function MigrationReview() {
  const today = dayKey()
  const pending = useLiveQuery(() => pendingTasks(today), [today])
  const [open, setOpen] = useState(false)

  // Close the sheet once the last task has been dealt with.
  useEffect(() => {
    if (open && pending?.length === 0) setOpen(false)
  }, [open, pending?.length])

  if (!pending?.length) return null
  const nextMonth = addMonths(monthKey(), 1)

  return (
    <>
      <button type="button" class="banner" onClick={() => setOpen(true)}>
        {pending.length === 1 ? 'Masz 1 niezrobione zadanie' : `Niezrobione zadania z poprzednich dni: ${pending.length}`} · Przejrzyj
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Migracja zadań">
          <p class="sheet-title">Co zrobić z niezrobionymi zadaniami?</p>
          <ul class="migration">
            {pending.map((task) => (
              <li key={task.id}>
                <div>
                  {task.text}
                  <br />
                  <span class="muted small">{formatDay(task.key)}</span>
                </div>
                <div class="row">
                  <button type="button" title="Przenieś na dziś" onClick={() => migrateEntry(task, 'daily', today)}>&gt; Dziś</button>
                  <button type="button" title="Do przyszłego logu, na następny miesiąc" onClick={() => migrateEntry(task, 'future', nextMonth)}>&lt; Później</button>
                  <button type="button" title="Skreśl jako nieaktualne" onClick={() => updateEntry(task.id, { status: 'cancelled' })}>Skreśl</button>
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
