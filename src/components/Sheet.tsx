import type { ComponentChildren } from 'preact'
import { createPortal } from 'preact/compat'
import { useEffect } from 'preact/hooks'

export function Sheet({ onClose, label, children }: { onClose: () => void; label: string; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])
  // Rendered into <body>: a sheet opened from the composer would otherwise sit
  // inside its fixed layer, underneath the tab bar.
  return createPortal(
    <div class="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>,
    document.body,
  )
}
