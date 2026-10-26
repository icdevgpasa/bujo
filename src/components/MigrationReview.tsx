import { useEffect, useState } from 'preact/hooks'
import { addMonths, dayKey, formatDay, monthKey } from '../dates'
import { migrateEntry, pendingTasks, updateEntry } from '../db'
import { focusOn } from '../focus'
import { plural } from '../plural'
import { useLiveQuery } from '../useLiveQuery'
import { Sheet } from './Sheet'

function pendingLabel(n: number): string {
  if (n === 1) return 'Jedno zadanie czeka z poprzednich dni'
  return `${n} ${plural(n, 'zadanie', 'zadania', 'zadań')} ${plural(n, 'czeka', 'czekają', 'czeka')} z poprzednich dni`
}

// Daily ritual: decide what to do with every task still open from earlier days.
export function MigrationReview() {
  const today = dayKey()
  const pending = useLiveQuery(() => pendingTasks(today), [today])
  const [open, setOpen] = useState(false)
  const gentle = focusOn('bujo:gentle')

  // Gentle mode opens the review by itself, once a day.
  useEffect(() => {
    if (!gentle || !pending?.length) return
    try {
      if (localStorage.getItem('bujo:reviewedOn') === today) return
      localStorage.setItem('bujo:reviewedOn', today)
    } catch {
      return
    }
    setOpen(true)
  }, [gentle, today, !!pending?.length])

  // Close the sheet once the last task has been dealt with.
  useEffect(() => {
    if (open && pending?.length === 0) setOpen(false)
  }, [open, pending?.length])

  if (!pending?.length) return null
  const nextMonth = addMonths(monthKey(), 1)

  return (
    <>
      <button type="button" class="banner" onClick={() => setOpen(true)}>
        {pendingLabel(pending.length)}
        <span class="banner-cta">Przejrzyj</span>
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} label="Migracja zadań">
          <p class="sheet-title">{gentle ? 'Dzień dobry! Co z tymi zadaniami?' : 'Co zrobić z niezrobionymi zadaniami?'}</p>
          <ul class="migration">
            {pending.map((task) => (
              <li key={task.id}>
                <div>
                  <span class="task">{task.text}</span>
                  <br />
                  <span class="muted small">{formatDay(task.key)}</span>
                  {gentle && (task.moves ?? 0) >= 2 && (
                    <p class="nudge">Przenoszone już {task.moves} razy. Czy to nadal ważne? Można odpuścić.</p>
                  )}
                </div>
                <div class="row">
                  <button type="button" title="Przenieś na dziś" onClick={() => migrateEntry(task, 'daily', today)}>&gt; Dziś</button>
                  <button type="button" title="Do przyszłego logu, na następny miesiąc" onClick={() => migrateEntry(task, 'future', nextMonth)}>&lt; Później</button>
                  <button type="button" title="Skreśl jako nieaktualne" onClick={() => updateEntry(task.id, { status: 'cancelled' })}>{gentle ? 'Odpuść' : 'Skreśl'}</button>
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
