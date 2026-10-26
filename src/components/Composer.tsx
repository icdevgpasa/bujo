import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import type { EntryType } from '../db'
import { BULLET, TYPE_LABEL } from './bullets'
import { PhotoPicker } from './PhotoPicker'

export function Composer({
  onSubmit,
  children,
}: {
  onSubmit: (type: EntryType, text: string, files: File[]) => Promise<unknown>
  children?: ComponentChildren
}) {
  const [text, setText] = useState('')
  const [type, setType] = useState<EntryType>('task')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: Event) => {
    e.preventDefault()
    const value = text.trim()
    if ((!value && !files.length) || busy) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(type, value, files)
      setText('')
      setFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form class="composer" onSubmit={submit}>
      {children}
      {files.length > 0 && (
        <div class="pending-photos">
          📷 {files.length} {files.length === 1 ? 'zdjęcie' : 'zdjęcia'}
          <button type="button" class="link" onClick={() => setFiles([])}>usuń</button>
        </div>
      )}
      {error && <div class="error" role="alert">{error}</div>}
      <div class="composer-row">
        <div class="types" role="radiogroup" aria-label="Rodzaj wpisu">
          {(Object.keys(BULLET) as EntryType[]).map((t) => (
            <button
              type="button"
              role="radio"
              aria-checked={type === t}
              aria-label={TYPE_LABEL[t]}
              title={TYPE_LABEL[t]}
              class={type === t ? 'active' : ''}
              onClick={() => setType(t)}
            >
              {BULLET[t]}
            </button>
          ))}
        </div>
        <input
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          placeholder="Nowy wpis…"
          aria-label="Treść wpisu"
          enterKeyHint="send"
        />
        <PhotoPicker onPick={(picked) => setFiles((f) => [...f, ...picked])} />
      </div>
    </form>
  )
}
