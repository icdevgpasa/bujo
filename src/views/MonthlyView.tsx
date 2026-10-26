import { useEffect, useState } from 'preact/hooks'
import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { HabitSheet } from '../components/HabitSheet'
import { addMonths, dayKey, daysOfMonth, formatMonth, monthKey, weekdayShort } from '../dates'
import {
  MAX_HABITS,
  addEntry,
  addHabit,
  carryOverHabits,
  entriesBetween,
  entriesFor,
  habitsFor,
  toggleHabit,
  type Habit,
} from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'
import { useSwipe } from '../useSwipe'

export function MonthlyView({ month }: { month: string }) {
  const days = daysOfMonth(month)
  const tasks = useLiveQuery(() => entriesFor('monthly', month), [month])
  const planned = useLiveQuery(() => entriesFor('future', month).then((list) => list.filter((e) => e.status === 'open')), [month])
  const events = useLiveQuery(
    () => entriesBetween('daily', days[0], days[days.length - 1]).then((list) => list.filter((e) => e.type === 'event')),
    [month],
  )
  const habits = useLiveQuery(() => habitsFor(month), [month])
  const [editing, setEditing] = useState<Habit>()
  const [adding, setAdding] = useState(false)
  const [newHabit, setNewHabit] = useState('')
  const [habitError, setHabitError] = useState('')
  useEffect(() => {
    carryOverHabits(month, addMonths(month, -1), monthKey())
  }, [month])

  const today = dayKey()
  useSwipe(
    () => (location.hash = href.month(addMonths(month, 1))),
    () => (location.hash = href.month(addMonths(month, -1))),
  )

  return (
    <>
      <header class="page-header">
        <a href={href.month(addMonths(month, -1))} aria-label="Poprzedni miesiąc">‹</a>
        <h1>{formatMonth(month)}</h1>
        <a href={href.month(addMonths(month, 1))} aria-label="Następny miesiąc">›</a>
      </header>

      <section>
        <div class="section-head">
          <h2>Kalendarz</h2>
          {habits && habits.length < MAX_HABITS && !adding && (
            <button type="button" class="link quiet-link" onClick={() => setAdding(true)}>
              + nawyk
            </button>
          )}
        </div>
        {adding && (
          <form
            class="habit-add"
            onSubmit={async (e) => {
              e.preventDefault()
              const name = newHabit.trim()
              if (!name) return setAdding(false)
              try {
                await addHabit(month, name)
                setNewHabit('')
                setAdding(false)
                setHabitError('')
              } catch (err) {
                setHabitError(err instanceof Error ? err.message : 'Nie udało się dodać nawyku.')
              }
            }}
          >
            <input
              value={newHabit}
              onInput={(e) => setNewHabit(e.currentTarget.value)}
              placeholder="np. woda, spacer, czytanie"
              aria-label="Nazwa nowego nawyku"
              maxLength={24}
              autoFocus
            />
            <button type="submit">Dodaj</button>
            <button type="button" onClick={() => setAdding(false)}>Anuluj</button>
          </form>
        )}
        {habitError && <p class="error" role="alert">{habitError}</p>}
        <ol class="calendar">
          {habits && habits.length > 0 && (
            <li class="habit-head">
              <span class="fill" />
              <span class="cells">
                {habits.map((h) => (
                  <button type="button" class="habit-name-head" aria-label={`Nawyk ${h.name}: opcje`} onClick={() => setEditing(h)}>
                    <span>{h.name}</span>
                  </button>
                ))}
              </span>
            </li>
          )}
          {days.map((d) => {
            const dayEvents = events?.filter((e) => e.key === d) ?? []
            const weekday = weekdayShort(d)
            const dayNum = Number(d.slice(-2))
            return (
              <li key={d} class={`${d === today ? 'today' : ''} ${weekday === 'niedz' || weekday === 'sob' ? 'weekend' : ''}`}>
                <a href={href.day(d)}>
                  <span class="num">{dayNum}</span>
                  <span class="wd">{weekday}</span>
                  <span class="ev">{dayEvents.map((e) => e.text).join(', ')}</span>
                </a>
                {habits && habits.length > 0 && (
                  <span class="cells">
                    {habits.map((h) => {
                      const done = h.done.includes(dayNum)
                      return (
                        <button
                          type="button"
                          class={`cell ${done ? 'done' : ''}`}
                          aria-pressed={done}
                          aria-label={`${h.name}, ${dayNum}`}
                          onClick={() => toggleHabit(h, dayNum)}
                        />
                      )
                    })}
                  </span>
                )}
              </li>
            )
          })}
          {habits && habits.length > 0 && (
            <li class="habit-foot">
              <span class="fill">Razem</span>
              <span class="cells">
                {habits.map((h) => (
                  <span class="count">{h.done.length}</span>
                ))}
              </span>
            </li>
          )}
        </ol>
      </section>

      {planned && planned.length > 0 && (
        <section>
          <h2>Z przyszłego logu</h2>
          <EntryList entries={planned} />
        </section>
      )}

      <section>
        <h2>Zadania na miesiąc</h2>
        <EntryList entries={tasks} empty="Brak zadań na ten miesiąc." />
      </section>

      <Composer onSubmit={(type, text, files) => addEntry('monthly', month, type, text, files)} />
      {editing && (
        <HabitSheet
          habit={habits?.find((h) => h.id === editing.id) ?? editing}
          days={days.length}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  )
}
