import { useRef } from 'preact/hooks'

// A camera button backed by a hidden file input; on phones it offers camera or gallery.
export function PhotoPicker({ onPick, label = 'Dodaj zdjęcie', children }: { onPick: (files: File[]) => void; label?: string; children?: preact.ComponentChildren }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" class="photo-button" aria-label={label} title={label} onClick={() => input.current?.click()}>
        {children ?? '📷'}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
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
