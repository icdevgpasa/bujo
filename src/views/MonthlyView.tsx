import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { addMonths, dayKey, daysOfMonth, formatMonth, weekdayShort } from '../dates'
import { addEntry, entriesBetween, entriesFor } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'

export function MonthlyView({ month }: { month: string }) {
  const days = daysOfMonth(month)
  const tasks = useLiveQuery(() => entriesFor('monthly', month), [month])
  const planned = useLiveQuery(() => entriesFor('future', month).then((list) => list.filter((e) => e.status === 'open')), [month])
  const events = useLiveQuery(
    () => entriesBetween('daily', days[0], days[days.length - 1]).then((list) => list.filter((e) => e.type === 'event')),
    [month],
  )
  const today = dayKey()

  return (
    <>
      <header class="page-header">
        <a href={href.month(addMonths(month, -1))} aria-label="Poprzedni miesiąc">‹</a>
        <h1>{formatMonth(month)}</h1>
        <a href={href.month(addMonths(month, 1))} aria-label="Następny miesiąc">›</a>
      </header>

      <section>
        <h2>Kalendarz</h2>
        <ol class="calendar">
          {days.map((d) => {
            const dayEvents = events?.filter((e) => e.key === d) ?? []
            const weekday = weekdayShort(d)
            return (
              <li key={d} class={`${d === today ? 'today' : ''} ${weekday === 'niedz' || weekday === 'sob' ? 'weekend' : ''}`}>
                <a href={href.day(d)}>
                  <span class="num">{Number(d.slice(-2))}</span>
                  <span class="wd">{weekday}</span>
                  <span class="ev">{dayEvents.map((e) => e.text).join(' · ')}</span>
                </a>
              </li>
            )
          })}
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
    </>
  )
}
