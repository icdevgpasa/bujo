import { useRef } from 'preact/hooks'

// A camera button backed by a hidden file input; on an iPhone it offers the
// photo library, the camera (photo or video) and Files.
export function MediaPicker({ onPick, label = 'Dodaj zdjęcie lub film', children }: { onPick: (files: File[]) => void; label?: string; children?: preact.ComponentChildren }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" class="photo-button" aria-label={label} title={label} onClick={() => input.current?.click()}>
        {children ?? '📷'}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? [])
          e.currentTarget.value = ''
          if (files.length) onPick(files)
        }}
      />
    </>
  )
}
