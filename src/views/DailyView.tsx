import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { MigrationReview } from '../components/MigrationReview'
import { addDays, dayKey, formatDay, weekdayLong } from '../dates'
import { backupIsDue } from '../backup'
import { addEntry, db, entriesFor } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'
import { useSwipe } from '../useSwipe'
import { useState } from 'preact/hooks'
import { InboxReview } from '../components/InboxReview'
import { OneThing } from '../components/OneThing'
import { focusOn } from '../focus'

export function DailyView({ day }: { day: string }) {
  const entries = useLiveQuery(() => entriesFor('daily', day), [day])
  const isToday = day === dayKey()
  const total = useLiveQuery(() => db.entries.count(), [])
  const [oneThing, setOneThing] = useState(false)
  // Top 3: starred tasks on top, everything else folded away below.
  const starred = focusOn('bujo:top3') ? (entries ?? []).filter((e) => e.star && e.status === 'open') : []
  const rest = entries?.filter((e) => !starred.includes(e))
  const openTasks = entries?.filter((e) => e.type === 'task' && e.status === 'open').length ?? 0
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
      {isToday && focusOn('bujo:inbox') && <InboxReview />}
      {focusOn('bujo:oneThing') && openTasks > 0 && (
        <button type="button" class="one-start" onClick={() => setOneThing(true)}>
          🎯 Jedna rzecz naraz
        </button>
      )}
      {isToday && total !== undefined && backupIsDue(total) && (
        <a class="banner quiet" href={href.backup()}>
          Dawno nie było kopii zapasowej
          <span class="banner-cta">Zapisz kopię</span>
        </a>
      )}
      {starred.length > 0 ? (
        <>
          <section class="top3">
            <h2>Najważniejsze</h2>
            <EntryList entries={starred} empty="" />
          </section>
          {rest && rest.length > 0 && (
            <details class="rest">
              <summary>Pozostałe ({rest.length})</summary>
              <EntryList entries={rest} empty="" />
            </details>
          )}
        </>
      ) : (
        <EntryList entries={entries} empty="Pusta strona. Dodaj pierwszy wpis poniżej." />
      )}
      {oneThing && entries && <OneThing entries={entries} onClose={() => setOneThing(false)} />}
      <Composer
        here={{ log: 'daily', key: day }}
        onSubmit={(type, text, media, to) => addEntry(to?.log ?? 'daily', to?.key ?? day, type, text, media)}
      />
    </>
  )
}
