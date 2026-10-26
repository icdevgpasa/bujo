import { useEffect, useRef, useState } from 'preact/hooks'
import { createBackup, lastBackupAt, readBackup, saveBackup, type BackupSummary } from '../backup'
import { describeAttachments } from '../components/attachments'
import { db, kindOf } from '../db'
import { plural } from '../plural'
import { useLiveQuery } from '../useLiveQuery'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Installed home-screen apps are exempt from Safari's storage eviction, so the
// warning only matters when the app runs in a normal browser tab.
const installed =
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

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
        <h1>Kopia zapasowa</h1>
      </header>

      <p class="note">
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
        {persisted === false && !installed && (
          <>
            <dt>Ochrona danych</dt>
            <dd class="warn">Przeglądarka może usunąć dane przy braku miejsca. Zainstaluj aplikację na ekranie głównym.</dd>
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
    </>
  )
}
