import { useState } from 'preact/hooks'
import { InstallGuide } from './components/InstallGuide'
import { monthKey } from './dates'
import { shouldOfferInstall } from './install'
import { href, useRoute, useTurn } from './router'
import { BackupView } from './views/BackupView'
import { DailyView } from './views/DailyView'
import { CollectionView } from './views/CollectionView'
import { FutureView } from './views/FutureView'
import { IndexView } from './views/IndexView'
import { MonthlyView } from './views/MonthlyView'

export function App() {
  const route = useRoute()
  const turn = useTurn(route)
  const [installGuide, setInstallGuide] = useState(shouldOfferInstall)
  return (
    <>
      <main class={`page turn-${turn}`}>
        {route.view === 'day' && <DailyView key={route.key} day={route.key} />}
        {route.view === 'month' && <MonthlyView key={route.key} month={route.key} />}
        {route.view === 'future' && <FutureView />}
        {route.view === 'backup' && <BackupView />}
        {route.view === 'index' && <IndexView />}
        {route.view === 'collection' && <CollectionView key={route.id} id={route.id} />}
      </main>
      <nav class="tabs" aria-label="Widoki">
        <a href={href.day()} aria-current={route.view === 'day' ? 'page' : undefined}>Dzień</a>
        <a href={href.month(monthKey())} aria-current={route.view === 'month' ? 'page' : undefined}>Miesiąc</a>
        <a href={href.future()} aria-current={route.view === 'future' ? 'page' : undefined}>Przyszłość</a>
        <a href={href.index()} aria-current={route.view === 'index' || route.view === 'collection' ? 'page' : undefined}>Indeks</a>
        <a
          href={href.backup()}
          class="icon-tab"
          aria-label="Kopia zapasowa"
          title="Kopia zapasowa"
          aria-current={route.view === 'backup' ? 'page' : undefined}
        >
          {/* A box with an arrow into it: saving everything for safekeeping. */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 13v6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-6" />
            <path d="M12 3v11" />
            <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
          </svg>
        </a>
      </nav>
      {installGuide && <InstallGuide onClose={() => setInstallGuide(false)} />}
    </>
  )
}
