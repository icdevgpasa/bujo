import type { ComponentChildren } from 'preact'
import { createPortal } from 'preact/compat'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'

// A full-screen page for writing, sized to what the keyboard leaves visible,
// so the whole text and the Save button stay in view while typing.
export function Writer({
  title,
  text,
  onText,
  onSave,
  onCancel,
  onPaste,
  saveDisabled,
  error,
  children,
  footer,
}: {
  title: string
  text: string
  onText: (text: string) => void
  onSave: () => void
  onCancel: () => void
  onPaste?: (e: ClipboardEvent) => void
  saveDisabled?: boolean
  error?: string
  children?: ComponentChildren
  footer?: ComponentChildren
}) {
  const panel = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const field = area.current
    if (field) {
      field.focus({ preventScroll: true })
      field.setSelectionRange(field.value.length, field.value.length)
    }
    // Follow the visual viewport: on iPhone the keyboard covers the bottom of
    // the layout viewport instead of shrinking it.
    const vv = window.visualViewport
    const el = panel.current
    if (!vv || !el) return
    const fit = () => {
      el.style.top = `${vv.offsetTop}px`
      el.style.height = `${vv.height}px`
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div class="writer" ref={panel} role="dialog" aria-modal="true" aria-label={title}>
      <div class="writer-bar">
        <button type="button" onClick={onCancel}>Anuluj</button>
        <span class="writer-title">{title}</span>
        <button type="button" class="primary" onClick={onSave} disabled={saveDisabled}>Zapisz</button>
      </div>
      {children}
      <textarea
        ref={area}
        value={text}
        onInput={(e) => onText(e.currentTarget.value)}
        onPaste={onPaste}
        placeholder="Pisz…"
        aria-label="Treść wpisu"
      />
      {error && <div class="error" role="alert">{error}</div>}
      {footer && <div class="writer-footer">{footer}</div>}
    </div>,
    document.body,
  )
}
