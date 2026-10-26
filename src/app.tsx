import { useState } from 'preact/hooks'
import { InstallGuide } from './components/InstallGuide'
import { BackupIcon, DayIcon, FutureIcon, IndexIcon, MonthIcon } from './components/TabIcons'
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
  const tabs = [
    { label: 'Dzień', link: href.day(), active: route.view === 'day', Glyph: DayIcon },
    { label: 'Miesiąc', link: href.month(monthKey()), active: route.view === 'month', Glyph: MonthIcon },
    { label: 'Przyszłość', link: href.future(), active: route.view === 'future', Glyph: FutureIcon },
    { label: 'Indeks i wyszukiwanie', link: href.index(), active: route.view === 'index' || route.view === 'collection', Glyph: IndexIcon },
    { label: 'Kopia zapasowa i wygląd', link: href.backup(), active: route.view === 'backup', Glyph: BackupIcon },
  ]
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
        {tabs.map(({ label, link, active, Glyph }) => (
          <a href={link} aria-label={label} title={label} aria-current={active ? 'page' : undefined}>
            <Glyph />
          </a>
        ))}
      </nav>
      {installGuide && <InstallGuide onClose={() => setInstallGuide(false)} />}
    </>
  )
}
