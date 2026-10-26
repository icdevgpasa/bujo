import { useEffect, useState } from 'preact/hooks'
import { canPromptInstall, onInstallPromptChange, platform, promptInstall, snoozeInstall } from '../install'
import { Sheet } from './Sheet'

// The iOS share symbol: a box with an arrow out of it.
const ShareIcon = () => (
  <svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label="Udostępnij">
    <path d="M8 9H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
    <path d="M12 3v12" />
    <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
  </svg>
)

function IosSteps() {
  return (
    <ol class="steps">
      <li>
        Otwórz tę stronę w <b>Safari</b>.
      </li>
      <li>
        Stuknij <ShareIcon /> <b>Udostępnij</b> na pasku Safari (jeśli go nie widać, najpierw stuknij <b>⋯</b>).
      </li>
      <li>
        Przewiń w dół i wybierz <b>Do ekranu początkowego</b>.
      </li>
      <li>
        Stuknij <b>Dodaj</b>. Od teraz otwieraj Bujo ikoną z ekranu.
      </li>
    </ol>
  )
}

function AndroidSteps() {
  return (
    <ol class="steps">
      <li>
        Otwórz tę stronę w <b>Chrome</b>.
      </li>
      <li>
        Stuknij menu <b>⋮</b> w prawym górnym rogu.
      </li>
      <li>
        Wybierz <b>Zainstaluj aplikację</b> albo <b>Dodaj do ekranu głównego</b>.
      </li>
      <li>
        Potwierdź. Od teraz otwieraj Bujo ikoną z ekranu.
      </li>
    </ol>
  )
}

export function InstallGuide({ onClose }: { onClose: () => void }) {
  const [oneTap, setOneTap] = useState(canPromptInstall)
  useEffect(() => onInstallPromptChange(() => setOneTap(canPromptInstall())), [])
  const os = platform()

  const later = () => {
    snoozeInstall()
    onClose()
  }

  return (
    <Sheet onClose={later} label="Dodaj Bujo do ekranu początkowego">
      <p class="sheet-title">Dodaj Bujo do ekranu</p>
      <p class="install-why">
        Wtedy otwiera się jak zwykła aplikacja, działa bez internetu, a telefon nie usunie twoich wpisów, gdy zabraknie miejsca.
      </p>
      {oneTap ? (
        <div class="actions">
          <button type="button" class="primary" onClick={async () => (await promptInstall()) && onClose()}>
            Zainstaluj Bujo
          </button>
        </div>
      ) : os === 'android' ? (
        <AndroidSteps />
      ) : os === 'ios' ? (
        <IosSteps />
      ) : (
        <>
          <h3>Na iPhonie</h3>
          <IosSteps />
          <h3>Na Androidzie</h3>
          <AndroidSteps />
        </>
      )}
      <p class="muted small">
        Zrób to, zanim zaczniesz pisać: wpisy zrobione w przeglądarce mogą nie pojawić się w aplikacji dodanej do ekranu.
      </p>
      <div class="actions">
        <button type="button" onClick={later}>Później</button>
      </div>
    </Sheet>
  )
}
