let proxy: HTMLInputElement | undefined

// iOS only raises the keyboard for a focus() made inside the tap itself, and
// the writing panel is rendered a moment later. Focusing an invisible input
// now keeps the keyboard up; the panel then moves focus to its text area.
export function primeKeyboard() {
  if (!proxy) {
    proxy = document.createElement('input')
    proxy.setAttribute('aria-hidden', 'true')
    proxy.tabIndex = -1
    // 16px stops Safari zooming in on focus.
    proxy.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none'
    document.body.append(proxy)
  }
  proxy.focus({ preventScroll: true })
}
