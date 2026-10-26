import { createPortal } from 'preact/compat'
import { useEffect } from 'preact/hooks'
import { isInstalled } from '../install'

const SEEN_KEY = 'bujo:tutorialSeen'
const VIDEO = `${import.meta.env.BASE_URL}tutorial/instrukcja.mp4`
const POSTER = `${import.meta.env.BASE_URL}tutorial/poster.jpg`
const CACHE = 'tutorial'

// Opens by itself on the first launches from the home screen, until it is
// watched to the end or put away for good.
export function shouldShowTutorial(): boolean {
  if (!isInstalled) return false
  try {
    return !localStorage.getItem(SEEN_KEY)
  } catch {
    return false
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()))
  } catch {
    // Blocked storage: it simply shows again next time.
  }
}

// The film is not part of the install (10 MB). Once someone plays it, a full
// copy goes into the cache the service worker serves it from, so it also
// plays offline afterwards.
async function keepOffline() {
  try {
    if (!('caches' in window) || (await caches.match(VIDEO))) return
    const response = await fetch(VIDEO)
    if (response.ok) await (await caches.open(CACHE)).put(VIDEO, response)
  } catch {
    // Offline or out of space: it streams again next time.
  }
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div class="tutorial" role="dialog" aria-modal="true" aria-label="Samouczek">
      <p class="tutorial-title">Jak korzystać z Bujo</p>
      <video
        src={VIDEO}
        poster={POSTER}
        controls
        playsInline
        preload="metadata"
        onPlay={keepOffline}
        onEnded={markSeen}
      />
      <div class="tutorial-actions">
        <button type="button" onClick={onClose}>Później</button>
        <button
          type="button"
          onClick={() => {
            markSeen()
            onClose()
          }}
        >
          Nie pokazuj więcej
        </button>
      </div>
    </div>,
    document.body,
  )
}
