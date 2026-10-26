import { useState } from 'preact/hooks'
import { deletePhoto, type Photo } from '../db'
import { BlobImage } from './BlobImage'

export function PhotoViewer({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const remove = async () => {
    if (!confirming) return setConfirming(true)
    await deletePhoto(photo.id)
    onClose()
  }
  return (
    <div class="viewer" role="dialog" aria-modal="true" aria-label="Zdjęcie" onClick={onClose}>
      <BlobImage blob={photo.blob} alt="Zdjęcie" />
      <div class="viewer-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" class={confirming ? 'danger' : ''} onClick={remove}>
          {confirming ? 'Na pewno usunąć?' : 'Usuń zdjęcie'}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </div>
  )
}
