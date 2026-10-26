import { bulletFor } from './components/bullets'
import { formatDay, weekdayLong } from './dates'
import { db, kindOf, type Entry, type Photo } from './db'

// Sharing out of the app (WhatsApp, Messages, Mail…) through the phone's own
// share sheet. A per-phone switch on the Ustawienia page, off by default.

const KEY = 'bujo:share'

export function shareOn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setShare(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    // Blocked storage: the switch lasts until the app closes.
  }
}

// One entry alone goes without its bullet: it reads like a plain message.
export function entryLine(entry: Entry, bullet = true): string {
  const steps = (entry.steps ?? []).map((s) => `\n   ${s.done ? '×' : '•'} ${s.text}`).join('')
  return `${bullet ? `${bulletFor(entry)} ` : ''}${entry.text}${steps}`
}

export function dayText(day: string, entries: Entry[]): string {
  return [`${formatDay(day)}, ${weekdayLong(day)}`, '', ...entries.map((e) => entryLine(e))].join('\n')
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}
const NAME = { image: 'zdjecie', audio: 'nagranie', video: 'film' } as const

// Named files, because the share sheet and WhatsApp go by the extension.
export function filesFor(media: Photo[]): File[] {
  return media.map((m, i) => {
    const type = m.blob.type.split(';')[0] || 'application/octet-stream'
    const ext = EXT[type] ?? type.split('/')[1] ?? 'bin'
    return new File([m.blob], `${NAME[kindOf(m)]}-${i + 1}.${ext}`, { type })
  })
}

export async function mediaFor(entryIds: number[]): Promise<Photo[]> {
  if (!entryIds.length) return []
  const media = await db.photos.where('entryId').anyOf(entryIds).toArray()
  // Keep the order the entries are listed in.
  return media.sort((a, b) => entryIds.indexOf(a.entryId) - entryIds.indexOf(b.entryId) || a.createdAt - b.createdAt)
}

export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'textOnly'

// Must be called straight from a tap, with the files already loaded: iPhone
// refuses the share sheet if the tap is too long ago.
export async function share(text: string, files: File[]): Promise<ShareResult> {
  // WhatsApp on iPhone drops the text when photos come with it, so the text
  // also goes to the clipboard, ready to paste as a caption.
  if (files.length) navigator.clipboard?.writeText(text).catch(() => {})
  if (!navigator.share) {
    await navigator.clipboard.writeText(text)
    return 'copied'
  }
  const withFiles = files.length > 0 && !!navigator.canShare?.({ files })
  try {
    await navigator.share(withFiles ? { text, files } : { text })
    return files.length && !withFiles ? 'textOnly' : 'shared'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    throw err
  }
}

export function describeShareError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'NotAllowedError') return 'Telefon nie pozwolił udostępnić. Stuknij jeszcze raz.'
  return 'Nie udało się udostępnić. Spróbuj jeszcze raz, ewentualnie bez załączników.'
}
