import type { MediaKind } from '../media'
import { plural } from '../plural'

const WORDS: Record<MediaKind, [string, string, string]> = {
  image: ['zdjęcie', 'zdjęcia', 'zdjęć'],
  video: ['film', 'filmy', 'filmów'],
  audio: ['nagranie', 'nagrania', 'nagrań'],
}

export const ICON: Record<MediaKind, string> = { image: '📷', video: '🎬', audio: '🎙' }

// "2 zdjęcia, 1 film" for whatever kinds are present.
export function describeAttachments(kinds: MediaKind[]): string {
  return (Object.keys(WORDS) as MediaKind[])
    .map((k) => [k, kinds.filter((x) => x === k).length] as const)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${plural(n, ...WORDS[k])}`)
    .join(', ')
}

// Stands in for the text of an entry that is only an attachment.
export function placeholderFor(kinds: MediaKind[]): string {
  return `(${WORDS[kinds[0] ?? 'image'][0]})`
}
