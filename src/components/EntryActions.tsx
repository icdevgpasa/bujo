import { useState } from 'preact/hooks'
import { describeClipboardError, findUrl, hostOf, readClipboard } from '../clipboard'
import { addDays, addMonths, dayKey, formatMonth, monthKey } from '../dates'
import { addMedia, db, deleteEntry, kindOf, migrateEntry, updateEntry, type Entry, type EntryType, type LogKind } from '../db'
import { compressPhoto, prepareMedia } from '../media'
import { useLiveQuery } from '../useLiveQuery'
import { describeAttachments, placeholderFor } from './attachments'
import { BULLET, TYPE_LABEL } from './bullets'
import { primeKeyboard } from '../keyboard'
import { focusOn, MAX_STARS } from '../focus'
import { FocusTimer, primeSound, TIMER_MINUTES } from './FocusTimer'
import { alarmLabel, openInCalendar, reminderFor, remindersOn } from '../reminders'
import { MediaPicker } from './MediaPicker'
import { RecordButton } from './Recorder'
import { Sheet } from './Sheet'
import { ShareSheet } from './ShareSheet'
import { entryLine, shareOn } from '../share'
import { Writer } from './Writer'

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
    case 'collection':
    case 'inbox':
      return [{ label: 'Na dziś', log: 'daily', key: today }]
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
  const [type, setType] = useState(entry.type)
  const [timer, setTimer] = useState<{ minutes: number; audio?: HTMLAudioElement }>()
  const [stepText, setStepText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')

  const run = (action: () => Promise<unknown>) => async () => {
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Coś poszło nie tak')
    }
  }

  // Appends straight to the entry: unlike the composer there is nothing to
  // review first, and edit/delete are one tap away if it was the wrong thing.
  const pasteInto = async () => {
    try {
      const { text: pastedText, images } = await readClipboard()
      if (!pastedText && !images.length) return setError('Schowek jest pusty.')
      if (pastedText) await updateEntry(entry.id, { text: entry.text ? `${entry.text} ${pastedText}` : pastedText })
      if (images.length) await addMedia(entry.id, await Promise.all(images.map(compressPhoto)))
      onClose()
    } catch (err) {
      setError(describeClipboardError(err))
    }
  }

  // Appends attachments straight to the entry, like paste does.
  const attach = (files: Blob[], duration?: number) =>
    run(async () => addMedia(entry.id, await Promise.all(files.map((f) => prepareMedia(f, duration)))))()

  const kinds = useLiveQuery(() => db.photos.where('entryId').equals(entry.id).toArray(), [entry.id])?.map(kindOf) ?? []

  const link = findUrl(entry.text)
  const isTask = entry.type === 'task'
  const isOpenTask = isTask && entry.status === 'open'
  const futureMonths = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(), i + 1))

  const addStep = async (e: Event) => {
    e.preventDefault()
    const text = stepText.trim()
    if (!text) return
    await updateEntry(entry.id, { steps: [...(entry.steps ?? []), { text, done: false }] })
    setStepText('')
  }

  if (sharing) return <ShareSheet title={`Udostępnij: ${TYPE_LABEL[entry.type].toLowerCase()}`} text={entryLine(entry, false)} entryIds={[entry.id]} onClose={onClose} />

  if (timer) return <FocusTimer entry={entry} minutes={timer.minutes} audio={timer.audio} onClose={onClose} />

  // Editing takes over the whole screen; Save returns to the page.
  if (editing)
    return (
      <Writer
        title="Edycja wpisu"
        text={text}
        onText={setText}
        onSave={run(() =>
          updateEntry(entry.id, {
            text: text.trim(),
            type,
            // Done and crossed-out only mean something for tasks.
            ...(type !== entry.type && (entry.status === 'done' || entry.status === 'cancelled') ? { status: 'open' as const } : {}),
          }),
        )}
        onCancel={() => setEditing(false)}
        error={error}
      >
        <div class="writer-types" role="radiogroup" aria-label="Rodzaj wpisu">
          {(Object.keys(BULLET) as EntryType[]).map((t) => (
            <button
              type="button"
              role="radio"
              aria-checked={type === t}
              class={`chip ${type === t ? 'active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setType(t)}
            >
              {BULLET[t]} {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </Writer>
    )

  return (
    <Sheet onClose={onClose} label={`${TYPE_LABEL[entry.type]}: ${entry.text}`}>
        <p class="sheet-title">
          <span class="muted">{TYPE_LABEL[entry.type]}</span>
          <br />
          {entry.text || placeholderFor(kinds)}
        </p>

      {error && <div class="error" role="alert">{error}</div>}

      {link && (
        <div class="actions">
          <a class="button-link" href={link} target="_blank" rel="noopener noreferrer">
            Otwórz link: {hostOf(link)}
          </a>
        </div>
      )}

      {focusOn('bujo:timer') && entry.status === 'open' && (
        <div class="chips">
          {TIMER_MINUTES.map((m) => (
            <button type="button" class="chip" onClick={() => setTimer({ minutes: m, audio: primeSound('chime') })}>
              ⏱ Skup się {m} min
            </button>
          ))}
        </div>
      )}

      {focusOn('bujo:steps') && isOpenTask && (
        <>
          <h3>Kroki</h3>
          {entry.steps && entry.steps.length > 0 && (
            <ul class="steps-edit">
              {entry.steps.map((step, i) => (
                <li key={i}>
                  <span class={step.done ? 'muted' : ''}>{step.done ? '× ' : '• '}{step.text}</span>
                  <button type="button" class="link" aria-label={`Usuń krok ${step.text}`} onClick={() => updateEntry(entry.id, { steps: entry.steps!.filter((_, j) => j !== i) })}>usuń</button>
                </li>
              ))}
            </ul>
          )}
          <form class="step-add" onSubmit={addStep}>
            <input value={stepText} onInput={(e) => setStepText(e.currentTarget.value)} placeholder="Mały krok, np. „umyć naczynia”" enterKeyHint="enter" aria-label="Nowy krok" />
            <button type="submit" disabled={!stepText.trim()}>Dodaj</button>
          </form>
        </>
      )}

      {focusOn('bujo:top3') && entry.log === 'daily' && entry.status === 'open' && (
        <div class="actions">
          <button
            type="button"
            onClick={run(async () => {
              if (!entry.star) {
                const starred = await db.entries.where('[log+key]').equals(['daily', entry.key]).filter((e) => !!e.star && e.status === 'open').count()
                if (starred >= MAX_STARS) throw new Error(`Najważniejsze mogą być najwyżej ${MAX_STARS} rzeczy dziennie. Zdejmij gwiazdkę z innej.`)
              }
              await updateEntry(entry.id, { star: !entry.star })
            })}
          >
            {entry.star ? '☆ Zdejmij z najważniejszych' : '⭐ Najważniejsze dziś'}
          </button>
        </div>
      )}

      {entry.remindAt && <p class="muted small">🔔 Przypomnienie w Kalendarzu: {alarmLabel(entry.remindAt)}</p>}
      {remindersOn() && entry.log === 'daily' && entry.status === 'open' && (
        <div class="actions">
          <button
            type="button"
            onClick={async () => {
              const reminder = reminderFor(entry.text, entry.key)
              await updateEntry(entry.id, { remindAt: reminder.alarm.getTime() })
              openInCalendar(reminder)
            }}
          >
            🔔 {entry.remindAt ? 'Przypomnij jeszcze raz' : 'Przypomnij'}: {reminderFor(entry.text, entry.key).label}
          </button>
        </div>
      )}

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
        <button
          type="button"
          onClick={() => {
            primeKeyboard()
            setEditing(true)
          }}
        >
          Edytuj tekst
        </button>
        {shareOn() && <button type="button" onClick={() => setSharing(true)}>📤 Udostępnij</button>}
        <button type="button" onClick={pasteInto}>📋 Wklej ze schowka</button>
        <MediaPicker onPick={(files) => attach(files)}>📷 Dodaj zdjęcie lub film</MediaPicker>
        <RecordButton class="photo-button" onRecorded={(audio, seconds) => attach([audio], seconds)}>🎙 Nagraj notatkę głosową</RecordButton>
        <button type="button" class={confirmDelete ? 'danger' : ''} onClick={confirmDelete ? run(() => deleteEntry(entry.id)) : () => setConfirmDelete(true)}>
          {confirmDelete ? (kinds.length ? `Na pewno usunąć wpis i ${describeAttachments(kinds)}?` : 'Na pewno usunąć wpis?') : 'Usuń wpis'}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </Sheet>
  )
}
