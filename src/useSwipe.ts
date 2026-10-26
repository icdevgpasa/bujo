import { useEffect, useRef } from 'preact/hooks'

const MIN_DISTANCE = 60
const MAX_DURATION = 600

// Horizontal swipe anywhere on the page, except where a swipe already means
// something else: text fields, scrolling chip rows, open sheets and viewers.
export function useSwipe(onLeft: () => void, onRight: () => void) {
  // Keep the listeners stable so a re-render mid-gesture doesn't drop it.
  const handlers = useRef({ onLeft, onRight })
  handlers.current = { onLeft, onRight }

  useEffect(() => {
    let start: { x: number; y: number; t: number } | undefined

    const onStart = (e: TouchEvent) => {
      const target = e.target as Element
      if (e.touches.length !== 1 || target.closest('input, textarea, .chips, .sheet-backdrop, .viewer, .one-thing')) {
        start = undefined
        return
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }

    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      const quick = Date.now() - start.t < MAX_DURATION
      start = undefined
      // Mostly sideways, so vertical scrolling never flips the page.
      if (!quick || Math.abs(dx) < MIN_DISTANCE || Math.abs(dy) > Math.abs(dx) * 0.6) return
      if (dx < 0) handlers.current.onLeft()
      else handlers.current.onRight()
    }

    addEventListener('touchstart', onStart, { passive: true })
    addEventListener('touchend', onEnd, { passive: true })
    return () => {
      removeEventListener('touchstart', onStart)
      removeEventListener('touchend', onEnd)
    }
  }, [])
}
