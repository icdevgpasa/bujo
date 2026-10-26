import { useEffect, useMemo, useState } from 'preact/hooks'
import { deletePhoto, kindOf, type Photo } from '../db'
import { formatDuration } from '../media'
import { BlobImage } from './BlobImage'

const NAME = { image: 'zdjęcie', video: 'film', audio: 'nagranie' } as const

function useBlobUrl(blob: Blob) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return url
}

function Player({ item }: { item: Photo }) {
  const url = useBlobUrl(item.blob)
  if (kindOf(item) === 'video') return <video src={url} controls autoPlay playsInline />
  return (
    <div class="viewer-audio">
      <span class="viewer-audio-icon" aria-hidden="true">🎙</span>
      <span class="viewer-audio-time">{formatDuration(item.duration)}</span>
      <audio src={url} controls autoPlay />
    </div>
  )
}

export function MediaViewer({ item, onClose }: { item: Photo; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const kind = kindOf(item)
  const remove = async () => {
    if (!confirming) return setConfirming(true)
    await deletePhoto(item.id)
    onClose()
  }
  return (
    <div class="viewer" role="dialog" aria-modal="true" aria-label={NAME[kind]} onClick={onClose}>
      <div class="viewer-media" onClick={(e) => kind !== 'image' && e.stopPropagation()}>
        {kind === 'image' ? <BlobImage blob={item.blob} alt="Zdjęcie" /> : <Player item={item} />}
      </div>
      <div class="viewer-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" class={confirming ? 'danger' : ''} onClick={remove}>
          {confirming ? 'Na pewno usunąć?' : `Usuń ${NAME[kind]}`}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </div>
  )
}
