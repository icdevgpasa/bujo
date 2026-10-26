export interface Pasted {
  text: string
  images: File[]
}

const URL_PATTERN = /https?:\/\/[^\s<>"]+/i

export function findUrl(text: string): string | undefined {
  return text.match(URL_PATTERN)?.[0]
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Must run inside a tap: Safari rejects clipboard reads outside a user gesture
// and shows its own small "Paste" bubble to confirm.
export async function readClipboard(): Promise<Pasted> {
  if (navigator.clipboard?.read) {
    const items = await navigator.clipboard.read()
    const images: File[] = []
    let text = ''
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith('image/'))
      if (imageType) {
        const blob = await item.getType(imageType)
        images.push(new File([blob], `wklejone.${imageType.split('/')[1]}`, { type: imageType }))
        continue
      }
      // A shared link may arrive only as a URI list, or as plain text, or both.
      for (const type of ['text/plain', 'text/uri-list']) {
        if (!text && item.types.includes(type)) text = (await (await item.getType(type)).text()).trim()
      }
    }
    return { text, images }
  }
  if (navigator.clipboard?.readText) return { text: (await navigator.clipboard.readText()).trim(), images: [] }
  throw new Error('Ta przeglądarka nie pozwala czytać schowka.')
}

export function describeClipboardError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'NotAllowedError') return 'Nie wklejono. Stuknij Wklej i potwierdź „Wklej” w dymku.'
  if (err instanceof Error && err.message) return err.message
  return 'Nie udało się odczytać schowka.'
}
