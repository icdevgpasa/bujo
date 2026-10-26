import { monthKey } from './dates'
import { href, useRoute } from './router'
import { BackupView } from './views/BackupView'
import { DailyView } from './views/DailyView'
import { FutureView } from './views/FutureView'
import { MonthlyView } from './views/MonthlyView'

export function App() {
  const route = useRoute()
  return (
    <>
      <main class="page">
        {route.view === 'day' && <DailyView key={route.key} day={route.key} />}
        {route.view === 'month' && <MonthlyView key={route.key} month={route.key} />}
        {route.view === 'future' && <FutureView />}
        {route.view === 'backup' && <BackupView />}
      </main>
      <nav class="tabs" aria-label="Widoki">
        <a href={href.day()} aria-current={route.view === 'day' ? 'page' : undefined}>Dzień</a>
        <a href={href.month(monthKey())} aria-current={route.view === 'month' ? 'page' : undefined}>Miesiąc</a>
        <a href={href.future()} aria-current={route.view === 'future' ? 'page' : undefined}>Przyszłość</a>
        <a href={href.backup()} aria-current={route.view === 'backup' ? 'page' : undefined}>Kopia</a>
      </nav>
    </>
  )
}
