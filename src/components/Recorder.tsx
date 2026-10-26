import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { formatDuration } from '../media'
import { Sheet } from './Sheet'

const MAX_SECONDS = 10 * 60
// Safari records AAC in MP4, Chrome and Firefox Opus in WebM.
const TYPES = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']

export const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

function describeError(err: unknown): string {
  if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError'))
    return 'Brak dostępu do mikrofonu. Zezwól na mikrofon w Ustawieniach → Safari → Mikrofon i spróbuj jeszcze raz.'
  if (err instanceof DOMException && err.name === 'NotFoundError') return 'Nie znaleziono mikrofonu.'
  return 'Nie udało się włączyć nagrywania.'
}

// Recording starts as soon as the sheet opens: the tap that opened it is the
// "record" tap, so a voice note takes two taps in total.
function RecorderSheet({ onDone, onClose }: { onDone: (audio: File, seconds: number) => void; onClose: () => void }) {
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [recording, setRecording] = useState(false)
  const recorder = useRef<MediaRecorder>()
  const keep = useRef(false)
  const startedAt = useRef(0)

  useEffect(() => {
    let stream: MediaStream | undefined
    let cancelled = false
    const chunks: Blob[] = []
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        stream = s
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t))
        const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined)
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
        rec.onstop = () => {
          s.getTracks().forEach((t) => t.stop())
          if (!keep.current || !chunks.length) return
          const type = (rec.mimeType || mimeType || 'audio/mp4').split(';')[0]
          const ext = type.includes('webm') ? 'webm' : 'm4a'
          const elapsed = (Date.now() - startedAt.current) / 1000
          onDone(new File(chunks, `nagranie.${ext}`, { type }), elapsed)
        }
        rec.start(1000)
        startedAt.current = Date.now()
        recorder.current = rec
        setRecording(true)
      })
      .catch((err) => setError(describeError(err)))
    return () => {
      cancelled = true
      if (recorder.current?.state === 'recording') recorder.current.stop()
      else stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => {
      const s = (Date.now() - startedAt.current) / 1000
      setSeconds(s)
      if (s >= MAX_SECONDS) finish()
    }, 250)
    return () => clearInterval(timer)
  }, [recording])

  const finish = () => {
    keep.current = true
    recorder.current?.stop()
    onClose()
  }

  return (
    <Sheet onClose={onClose} label="Nagrywanie">
      <div class="recorder">
        {error ? (
          <p class="error" role="alert">{error}</p>
        ) : (
          <>
            <span class={`rec-dot ${recording ? 'on' : ''}`} aria-hidden="true" />
            <span class="rec-time" role="timer" aria-live="off">{formatDuration(seconds)}</span>
            <span class="muted">{recording ? 'Nagrywam…' : 'Włączam mikrofon…'}</span>
          </>
        )}
      </div>
      <div class="row">
        <button type="button" onClick={onClose}>Anuluj</button>
        {!error && (
          <button type="button" class="primary" onClick={finish} disabled={!recording}>
            Zatrzymaj i dodaj
          </button>
        )}
      </div>
    </Sheet>
  )
}

export function RecordButton({
  onRecorded,
  class: className = 'photo-button',
  children,
}: {
  onRecorded: (audio: File, seconds: number) => void
  class?: string
  children?: ComponentChildren
}) {
  const [open, setOpen] = useState(false)
  if (!canRecord) return null
  return (
    <>
      <button type="button" class={className} aria-label="Nagraj notatkę głosową" title="Nagraj notatkę głosową" onClick={() => setOpen(true)}>
        {children ?? '🎙'}
      </button>
      {open && <RecorderSheet onDone={onRecorded} onClose={() => setOpen(false)} />}
    </>
  )
}
