import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { describeClipboardError, findUrl, readClipboard, type Pasted } from '../clipboard'
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

  // Fill the composer rather than saving straight away, so a pasted link or
  // photo can get a comment (or be dropped) before it becomes an entry.
  const applyPaste = ({ text: pastedText, images }: Pasted) => {
    if (!pastedText && !images.length) return setError('Schowek jest pusty.')
    setError('')
    if (pastedText) {
      setText((current) => (current.trim() ? `${current.trim()} ${pastedText}` : pastedText))
      if (findUrl(pastedText) && !text.trim()) setType('note')
    }
    if (images.length) setFiles((f) => [...f, ...images])
  }

  const paste = async () => {
    try {
      applyPaste(await readClipboard())
    } catch (err) {
      setError(describeClipboardError(err))
    }
  }

  // Long-press → Paste inside the text field: let text through as usual,
  // but catch images, which a text field would otherwise drop.
  const onPaste = (e: ClipboardEvent) => {
    const images = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (!images.length) return
    e.preventDefault()
    applyPaste({ text: '', images })
  }

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
          onPaste={onPaste}
        />
        <button type="button" class="photo-button" aria-label="Wklej ze schowka" title="Wklej ze schowka" onClick={paste}>
          📋
        </button>
        <PhotoPicker onPick={(picked) => setFiles((f) => [...f, ...picked])} />
      </div>
    </form>
  )
}
