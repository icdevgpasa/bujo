export const isInstalled =
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export type Platform = 'ios' | 'android' | 'other'

export function platform(): Platform {
  const ua = navigator.userAgent
  // iPadOS reports itself as a Mac; touch gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

// Chrome on Android offers its own install dialog; keep the event so a
// button can open it later.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | undefined
const listeners = new Set<() => void>()

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as InstallPromptEvent
  listeners.forEach((l) => l())
})

export function canPromptInstall() {
  return !!deferred
}

export function onInstallPromptChange(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  deferred = undefined
  await event.prompt()
  return (await event.userChoice).outcome === 'accepted'
}

const SNOOZE_KEY = 'bujo:installSnoozed'
const SNOOZE_DAYS = 3

// Opens by itself on a visit in the browser, unless put off recently.
export function shouldOfferInstall(): boolean {
  if (isInstalled) return false
  try {
    const snoozed = Number(localStorage.getItem(SNOOZE_KEY))
    return !snoozed || Date.now() - snoozed > SNOOZE_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return true
  }
}

export function snoozeInstall() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()))
  } catch {
    // Blocked storage: it simply asks again next time.
  }
}
