import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { MigrationReview } from '../components/MigrationReview'
import { addDays, dayKey, formatDay, weekdayLong } from '../dates'
import { backupIsDue } from '../backup'
import { addEntry, db, entriesFor } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'
import { useSwipe } from '../useSwipe'

export function DailyView({ day }: { day: string }) {
  const entries = useLiveQuery(() => entriesFor('daily', day), [day])
  const isToday = day === dayKey()
  const total = useLiveQuery(() => db.entries.count(), [])
  useSwipe(
    () => (location.hash = href.day(addDays(day, 1))),
    () => (location.hash = href.day(addDays(day, -1))),
  )
  return (
    <>
      <header class="page-header">
        <a href={href.day(addDays(day, -1))} aria-label="Poprzedni dzień">‹</a>
        <h1>
          {formatDay(day)}
          <span class="weekday">{weekdayLong(day)}</span>
        </h1>
        <a href={href.day(addDays(day, 1))} aria-label="Następny dzień">›</a>
      </header>
      {!isToday && <a class="back-today" href={href.day()}>Wróć do dziś</a>}
      {isToday && <MigrationReview />}
      {isToday && total !== undefined && backupIsDue(total) && (
        <a class="banner quiet" href={href.backup()}>
          Dawno nie było kopii zapasowej
          <span class="banner-cta">Zapisz kopię</span>
        </a>
      )}
      <EntryList entries={entries} empty="Pusta strona. Dodaj pierwszy wpis poniżej." />
      <Composer onSubmit={(type, text, files) => addEntry('daily', day, type, text, files)} />
    </>
  )
}
