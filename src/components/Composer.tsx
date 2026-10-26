import type { ComponentChildren } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { describeClipboardError, findUrl, readClipboard, type Pasted } from '../clipboard'
import type { EntryType } from '../db'
import { primeKeyboard } from '../keyboard'
import { prepareMedia, type Prepared } from '../media'
import { describeAttachments } from './attachments'
import { BULLET, TYPE_LABEL } from './bullets'
import { MediaPicker } from './MediaPicker'
import { RecordButton } from './Recorder'
import { Writer } from './Writer'

export function Composer({
  onSubmit,
  children,
}: {
  onSubmit: (type: EntryType, text: string, media: Prepared[]) => Promise<unknown>
  children?: ComponentChildren
}) {
  const [text, setText] = useState('')
  const [type, setType] = useState<EntryType>('task')
  const [media, setMedia] = useState<Prepared[]>([])
  const [preparing, setPreparing] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [writing, setWriting] = useState(false)

  const openWriter = () => {
    primeKeyboard()
    setWriting(true)
  }
  const closeWriter = useCallback(() => setWriting(false), [])

  // Prepare attachments as they are picked, so a film that is too long is
  // turned away straight away rather than when the entry is saved.
  const attach = async (files: Blob[], duration?: number) => {
    setError('')
    setPreparing((n) => n + files.length)
    await Promise.all(
      files.map(async (file) => {
        try {
          const prepared = await prepareMedia(file, duration)
          setMedia((m) => [...m, prepared])
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Nie udało się dodać pliku.')
        } finally {
          setPreparing((n) => n - 1)
        }
      }),
    )
  }

  // Fill the composer rather than saving straight away, so a pasted link or
  // photo can get a comment (or be dropped) before it becomes an entry.
  const applyPaste = ({ text: pastedText, images }: Pasted) => {
    if (!pastedText && !images.length) return setError('Schowek jest pusty.')
    setError('')
    if (pastedText) {
      setText((current) => (current.trim() ? `${current.trim()} ${pastedText}` : pastedText))
      if (findUrl(pastedText) && !text.trim()) setType('note')
    }
    if (images.length) attach(images)
    setWriting(true)
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

  const submit = async () => {
    const value = text.trim()
    if ((!value && !media.length) || busy || preparing) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(type, value, media)
      setText('')
      setMedia([])
      setWriting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać')
    } finally {
      setBusy(false)
    }
  }

  const pickAndWrite = (files: Blob[], duration?: number) => {
    attach(files, duration)
    setWriting(true)
  }

  const attachments = (media.length > 0 || preparing > 0) && (
    <div class="pending-photos">
      {describeAttachments(media.map((m) => m.kind))}
      {preparing > 0 && <span>{media.length ? ', ' : ''}przygotowuję…</span>}
      {media.length > 0 && <button type="button" class="link" onClick={() => setMedia([])}>usuń</button>}
    </div>
  )

  const tools = (
    <>
      <button type="button" class="photo-button" aria-label="Wklej ze schowka" title="Wklej ze schowka" onClick={paste}>
        📋
      </button>
      <MediaPicker onPick={(picked) => pickAndWrite(picked)} />
      <RecordButton onRecorded={(audio, seconds) => pickAndWrite([audio], seconds)} />
    </>
  )

  const draft = text.trim()

  return (
    <div class="composer">
      {children}
      {!writing && attachments}
      {!writing && error && <div class="error" role="alert">{error}</div>}
      <div class="composer-row">
        {/* Looks like a text field; writing happens on the full-screen page. */}
        <button type="button" class={`compose-field ${draft ? 'has-draft' : ''}`} onClick={openWriter}>
          <span class="compose-bullet" aria-hidden="true">{BULLET[type]}</span>
          <span class="compose-text">{draft || 'Nowy wpis…'}</span>
        </button>
        {tools}
      </div>
      {writing && (
        <Writer
          title="Nowy wpis"
          text={text}
          onText={setText}
          onPaste={onPaste}
          onSave={submit}
          onCancel={closeWriter}
          saveDisabled={busy || preparing > 0 || (!draft && !media.length)}
          error={error}
          footer={
            <>
              <div class="writer-tools">{tools}</div>
              {attachments}
            </>
          }
        >
          <div class="writer-types" role="radiogroup" aria-label="Rodzaj wpisu">
            {(Object.keys(BULLET) as EntryType[]).map((t) => (
              <button
                type="button"
                role="radio"
                aria-checked={type === t}
                class={`chip ${type === t ? 'active' : ''}`}
                // Keep focus (and the keyboard) in the text area.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setType(t)}
              >
                {BULLET[t]} {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Writer>
      )}
    </div>
  )
}
