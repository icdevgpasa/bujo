import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { MigrationReview } from '../components/MigrationReview'
import { addDays, dayKey, formatDay } from '../dates'
import { addEntry, entriesFor } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'

export function DailyView({ day }: { day: string }) {
  const entries = useLiveQuery(() => entriesFor('daily', day), [day])
  const isToday = day === dayKey()
  return (
    <>
      <header class="page-header">
        <a href={href.day(addDays(day, -1))} aria-label="Poprzedni dzień">‹</a>
        <h1>{formatDay(day)}</h1>
        <a href={href.day(addDays(day, 1))} aria-label="Następny dzień">›</a>
      </header>
      {!isToday && <a class="back-today" href={href.day()}>Wróć do dziś</a>}
      {isToday && <MigrationReview />}
      <EntryList entries={entries} empty="Pusta strona. Dodaj pierwszy wpis poniżej." />
      <Composer onSubmit={(type, text, files) => addEntry('daily', day, type, text, files)} />
    </>
  )
}
