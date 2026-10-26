import { useEffect, useState } from 'preact/hooks'
import { kindOf } from '../db'
import { describeShareError, filesFor, mediaFor, share, type ShareResult } from '../share'
import { describeAttachments } from './attachments'
import { Sheet } from './Sheet'

const DONE: Record<Exclude<ShareResult, 'cancelled'>, string> = {
  shared: 'Udostępnione. Tekst jest też w schowku, gdyby aplikacja wzięła same załączniki.',
  copied: 'Ten telefon nie ma okna udostępniania, więc tekst skopiowałem do schowka.',
  textOnly: 'Telefon przyjął tylko tekst, bez załączników.',
}

// Loads the attachments first, so that the Udostępnij tap can open the share
// sheet right away (iPhone refuses it after a slow tap).
export function ShareSheet({ title, text, entryIds, onClose }: { title: string; text: string; entryIds: number[]; onClose: () => void }) {
  const [files, setFiles] = useState<File[]>()
  const [kinds, setKinds] = useState<ReturnType<typeof kindOf>[]>([])
  const [withMedia, setWithMedia] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    mediaFor(entryIds).then((media) => {
      setKinds(media.map(kindOf))
      setFiles(filesFor(media))
    })
  }, [entryIds.join()])

  const go = async () => {
    setError('')
    setStatus('')
    try {
      const result = await share(text, withMedia ? files ?? [] : [])
      if (result === 'cancelled') return
      setStatus(result === 'shared' && !(withMedia && files?.length) ? 'Udostępnione.' : DONE[result])
    } catch (err) {
      setError(describeShareError(err))
    }
  }

  return (
    <Sheet onClose={onClose} label={title}>
      <p class="sheet-title">{title}</p>
      <pre class="share-preview">{text}</pre>
      {kinds.length > 0 && (
        <label class="toggle">
          <input type="checkbox" checked={withMedia} onChange={(e) => setWithMedia(e.currentTarget.checked)} />
          <span>Z załącznikami: {describeAttachments(kinds)}</span>
        </label>
      )}
      {error && <div class="error" role="alert">{error}</div>}
      {status && <p class="muted small" role="status">{status}</p>}
      <div class="actions">
        <button type="button" class="primary" disabled={!files} onClick={go}>
          📤 Udostępnij
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </Sheet>
  )
}
