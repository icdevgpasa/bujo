import { useEffect, useRef, useState } from 'preact/hooks'
import { createBackup, lastBackupAt, readBackup, saveBackup, type BackupSummary } from '../backup'
import { describeAttachments } from '../components/attachments'
import { db, kindOf } from '../db'
import { plural } from '../plural'
import { InstallGuide } from '../components/InstallGuide'
import { isInstalled } from '../install'
import { FOCUS, focusOn, setFocus, type FocusKey } from '../focus'
import { HOURS, LEADS, reminderHour, reminderLead, remindersOn, setReminderHour, setReminderLead, setRemindersOn } from '../reminders'
import { setSmartDates, smartDatesOn } from '../smartDates'
import { currentDark, currentTheme, setDark, setTheme, THEMES, type Dark, type Theme } from '../theme'
import { useLiveQuery } from '../useLiveQuery'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}


export function BackupView() {
  // Rows read from IndexedDB hold Blob handles, not the bytes, so this stays cheap.
  const counts = useLiveQuery(async () => ({ entries: await db.entries.count(), media: (await db.photos.toArray()).map(kindOf) }), [])
  const [usage, setUsage] = useState<number>()
  const [persisted, setPersisted] = useState<boolean>()
  const [last, setLast] = useState(lastBackupAt)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{ summary: BackupSummary; restore: () => Promise<void> }>()
  const [ready, setReady] = useState<File>()
  const fileInput = useRef<HTMLInputElement>(null)
  const [theme, setThemeState] = useState(currentTheme)
  const [dark, setDarkState] = useState(currentDark)
  const [guide, setGuide] = useState(false)
  const [smartDates, setSmartDatesState] = useState(smartDatesOn)
  const [reminders, setRemindersState] = useState(remindersOn)
  const [focus, setFocusState] = useState(() => Object.fromEntries(FOCUS.map((f) => [f.key, focusOn(f.key)])) as Record<FocusKey, boolean>)
  const [lead, setLeadState] = useState(reminderLead)
  const [hour, setHourState] = useState(reminderHour)

  const chooseTheme = (t: Theme) => {
    setTheme(t)
    setThemeState(t)
  }

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage(e.usage))
    navigator.storage?.persisted?.().then(setPersisted)
  }, [counts?.entries, counts?.media.length])

  const exportBackup = async () => {
    setBusy(true)
    setError('')
    setStatus('Przygotowuję plik…')
    try {
      const file = ready ?? (await createBackup())
      const result = await saveBackup(file)
      setReady(result === 'needs-tap' ? file : undefined)
      setLast(lastBackupAt())
      setStatus(
        result === 'needs-tap'
          ? 'Plik gotowy. Stuknij jeszcze raz, żeby go zapisać.'
          : result === 'cancelled'
            ? ''
            : 'Kopia zapisana. Trzymaj plik poza telefonem, np. w iCloud Drive.',
      )
    } catch (err) {
      setStatus('')
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać kopii.')
    } finally {
      setBusy(false)
    }
  }

  const pickFile = async (file: File) => {
    setError('')
    setStatus('')
    try {
      setPending(await readBackup(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się odczytać pliku.')
    }
  }

  const restore = async () => {
    if (!pending) return
    setBusy(true)
    try {
      await pending.restore()
      setPending(undefined)
      setStatus('Kopia przywrócona.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przywrócić kopii.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header class="page-header">
        <h1>Ustawienia</h1>
      </header>

      <section class="settings-section">
        <h2>Wygląd</h2>
        <div class="themes" role="radiogroup" aria-label="Wygląd">
          {THEMES.map((t) => (
            <button type="button" role="radio" aria-checked={theme === t.id} class="theme-option" onClick={() => chooseTheme(t.id)}>
              <span class={`swatch swatch-${t.id}`} aria-hidden="true">{t.id === 'modern' ? <i /> : '• '}Kupić chleb</span>
              {t.label}
            </button>
          ))}
        </div>
        <p class="small dark-label">Tryb nocny</p>
        <div class="chips" role="radiogroup" aria-label="Tryb nocny">
          {(
            [
              ['off', 'Wyłączony'],
              ['on', 'Włączony'],
              ['auto', 'Jak w telefonie'],
            ] as [Dark, string][]
          ).map(([d, label]) => (
            <button
              type="button"
              role="radio"
              aria-checked={dark === d}
              class={`chip ${dark === d ? 'active' : ''}`}
              onClick={() => {
                setDark(d)
                setDarkState(d)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section class="settings-section">
        <h2>Pisanie</h2>
        <label class="toggle">
          <input
            type="checkbox"
            checked={smartDates}
            onChange={(e) => {
              setSmartDates(e.currentTarget.checked)
              setSmartDatesState(e.currentTarget.checked)
            }}
          />
          <span>
            <b>Rozpoznawaj daty i rodzaj wpisu</b>
            <br />
            <span class="muted small">„Kupić jutro chleb” trafi na jutro jako zadanie „Kupić chleb”, a „urodziny Mariusza w grudniu” do grudnia jako wydarzenie. Rozumie m.in. jutro, pojutrze, w piątek, za 3 dni, 15 listopada, w grudniu.</span>
          </span>
        </label>
      </section>

      <section class="settings-section">
        <h2>Skupienie</h2>
        <p class="muted small">Pomocnicy na rozproszone dni, przydatni np. przy ADHD. Włącz tylko te, które pomagają.</p>
        {FOCUS.map((f) => (
          <label class="toggle">
            <input
              type="checkbox"
              checked={focus[f.key]}
              onChange={(e) => {
                const on = e.currentTarget.checked
                setFocus(f.key, on)
                setFocusState((s) => ({ ...s, [f.key]: on }))
              }}
            />
            <span>
              <b>{f.label}</b>
              <br />
              <span class="muted small">{f.hint}</span>
            </span>
          </label>
        ))}
      </section>

      <section class="settings-section">
        <h2>Przypomnienia</h2>
        <label class="toggle">
          <input
            type="checkbox"
            checked={reminders}
            onChange={(e) => {
              setRemindersOn(e.currentTarget.checked)
              setRemindersState(e.currentTarget.checked)
            }}
          />
          <span>
            <b>Przypomnienia w Kalendarzu</b>
            <br />
            <span class="muted small">Przy wpisie na konkretny dzień pojawi się 🔔. Stuknięcie dodaje wydarzenie z alarmem do Kalendarza telefonu. Godzinę bierze z tekstu („dentysta o 15”), a jeśli jej nie ma, z ustawienia niżej.</span>
          </span>
        </label>
        {reminders && (
          <div class="reminder-settings">
            <p class="small">Przypomnij przed</p>
            <div class="chips" role="radiogroup" aria-label="Przypomnij przed">
              {LEADS.map((l) => (
                <button type="button" role="radio" aria-checked={lead === l.minutes} class={`chip ${lead === l.minutes ? 'active' : ''}`} onClick={() => { setReminderLead(l.minutes); setLeadState(l.minutes) }}>
                  {l.label}
                </button>
              ))}
            </div>
            <p class="small">Gdy wpis nie ma godziny</p>
            <div class="chips" role="radiogroup" aria-label="Godzina, gdy wpis jej nie ma">
              {HOURS.map((h) => (
                <button type="button" role="radio" aria-checked={hour === h} class={`chip ${hour === h ? 'active' : ''}`} onClick={() => { setReminderHour(h); setHourState(h) }}>
                  {h}:00
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section class="settings-section">
        <h2>Kopia zapasowa</h2>
        <p class="muted small">
          Wszystko, co zapisujesz, jest tylko w tym telefonie. Jeśli go zgubisz albo usuniesz aplikację, wpisy, zdjęcia, filmy i nagrania znikną. Zapisuj kopię co jakiś czas w bezpiecznym miejscu.
        </p>

        <dl class="facts">
          <dt>Wpisy</dt>
          <dd>{counts?.entries ?? '…'}</dd>
          <dt>Załączniki</dt>
          <dd>{counts ? describeAttachments(counts.media) || 'brak' : '…'}</dd>
          {usage !== undefined && (
            <>
              <dt>Zajęte miejsce</dt>
              <dd>{formatBytes(usage)}</dd>
            </>
          )}
          <dt>Ostatnia kopia</dt>
          <dd>{last ? formatDate(last) : 'jeszcze nie było'}</dd>
          {/* Home-screen apps are exempt from Safari's storage eviction, so this
              only matters when the app runs in a browser tab. */}
          {persisted === false && !isInstalled && (
            <>
              <dt>Ochrona danych</dt>
              <dd class="warn">
                Przeglądarka może usunąć dane przy braku miejsca.{' '}
                <button type="button" class="link inline" onClick={() => setGuide(true)}>Dodaj aplikację do ekranu</button>
              </dd>
            </>
          )}
        </dl>

        {error && <p class="error" role="alert">{error}</p>}
        {status && <p class="status" role="status">{status}</p>}

        {pending ? (
          <div class="confirm">
            <p>
              Kopia z {formatDate(pending.summary.createdAt)}: {pending.summary.entries}{' '}
              {plural(pending.summary.entries, 'wpis', 'wpisy', 'wpisów')}
              {pending.summary.media.length > 0 && `, ${describeAttachments(pending.summary.media)}`}.
            </p>
            <p class="warn">Przywrócenie zastąpi wszystko, co jest teraz w aplikacji.</p>
            <div class="row">
              <button type="button" onClick={() => setPending(undefined)} disabled={busy}>Anuluj</button>
              <button type="button" class="danger" onClick={restore} disabled={busy}>Zastąp i przywróć</button>
            </div>
          </div>
        ) : (
          <div class="actions">
            <button type="button" class="primary" onClick={exportBackup} disabled={busy}>
              {ready ? 'Zapisz gotowy plik' : 'Zapisz kopię'}
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Przywróć z pliku</button>
            <input
              ref={fileInput}
              type="file"
              accept="application/zip,.zip,application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.currentTarget.files?.[0]
                e.currentTarget.value = ''
                if (file) pickFile(file)
              }}
            />
          </div>
        )}
      </section>

      {!isInstalled && (
        <p>
          <button type="button" class="link inline" onClick={() => setGuide(true)}>Jak dodać Bujo do ekranu telefonu</button>
        </p>
      )}
      {guide && <InstallGuide onClose={() => setGuide(false)} />}
    </>
  )
}
