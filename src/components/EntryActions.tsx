import { useState } from 'preact/hooks'
import { addDays, addMonths, dayKey, formatMonth, monthKey } from '../dates'
import { addPhotos, deleteEntry, migrateEntry, updateEntry, type Entry, type LogKind } from '../db'
import { TYPE_LABEL } from './bullets'
import { PhotoPicker } from './PhotoPicker'
import { Sheet } from './Sheet'

interface Target {
  label: string
  log: LogKind
  key: string
}

function targetsFor(entry: Entry): Target[] {
  const today = dayKey()
  const thisMonth = monthKey()
  switch (entry.log) {
    case 'daily': {
      const targets: Target[] = []
      if (entry.key < today) targets.push({ label: 'Na dziś', log: 'daily', key: today })
      targets.push({ label: 'Na następny dzień', log: 'daily', key: addDays(entry.key, 1) })
      return targets
    }
    case 'monthly':
      return [
        { label: 'Na dziś', log: 'daily', key: today },
        { label: 'Na następny miesiąc', log: 'monthly', key: addMonths(entry.key, 1) },
      ]
    case 'future':
      return [
        { label: 'Na dziś', log: 'daily', key: today },
        { label: `Do miesiąca: ${formatMonth(entry.key < thisMonth ? thisMonth : entry.key, false)}`, log: 'monthly', key: entry.key < thisMonth ? thisMonth : entry.key },
      ]
  }
}

export function EntryActions({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.text)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')

  const run = (action: () => Promise<unknown>) => async () => {
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak')
    }
  }

  const isTask = entry.type === 'task'
  const isOpenTask = isTask && entry.status === 'open'
  const futureMonths = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(), i + 1))

  return (
    <Sheet onClose={onClose} label={`${TYPE_LABEL[entry.type]}: ${entry.text}`}>
      {editing ? (
        <form
          class="edit"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => updateEntry(entry.id, { text: text.trim() }))()
          }}
        >
          <textarea value={text} onInput={(e) => setText(e.currentTarget.value)} rows={3} aria-label="Treść wpisu" autoFocus />
          <div class="row">
            <button type="button" onClick={() => setEditing(false)}>Anuluj</button>
            <button type="submit" class="primary">Zapisz</button>
          </div>
        </form>
      ) : (
        <p class="sheet-title">
          <span class="muted">{TYPE_LABEL[entry.type]}</span>
          <br />
          {entry.text || '(zdjęcie)'}
        </p>
      )}

      {error && <div class="error" role="alert">{error}</div>}

      {isTask && (
        <div class="actions">
          {entry.status === 'open' && <button type="button" onClick={run(() => updateEntry(entry.id, { status: 'done' }))}>× Zrobione</button>}
          {entry.status !== 'open' && <button type="button" onClick={run(() => updateEntry(entry.id, { status: 'open' }))}>• Przywróć jako otwarte</button>}
          {isOpenTask && <button type="button" onClick={run(() => updateEntry(entry.id, { status: 'cancelled' }))}>Skreśl (nieaktualne)</button>}
        </div>
      )}

      {isOpenTask && (
        <>
          <h3>Przenieś</h3>
          <div class="actions">
            {targetsFor(entry).map((t) => (
              <button type="button" onClick={run(() => migrateEntry(entry, t.log, t.key))}>&gt; {t.label}</button>
            ))}
          </div>
          {entry.log !== 'future' && (
            <>
              <h3>Zaplanuj w przyszłym logu</h3>
              <div class="chips">
                {futureMonths.map((m) => (
                  <button type="button" class="chip" onClick={run(() => migrateEntry(entry, 'future', m))}>
                    &lt; {formatMonth(m, false)}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div class="actions">
        {!editing && <button type="button" onClick={() => setEditing(true)}>Edytuj tekst</button>}
        <PhotoPicker onPick={(files) => run(() => addPhotos(entry.id, files))()}>📷 Dodaj zdjęcie</PhotoPicker>
        <button type="button" class={confirmDelete ? 'danger' : ''} onClick={confirmDelete ? run(() => deleteEntry(entry.id)) : () => setConfirmDelete(true)}>
          {confirmDelete ? 'Na pewno usunąć wpis i jego zdjęcia?' : 'Usuń wpis'}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </Sheet>
  )
}
