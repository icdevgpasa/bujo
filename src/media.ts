const FULL_SIZE = 1600
const THUMB_SIZE = 320
// Videos are kept as they come off the phone, so cap them: a minute of
// iPhone video is roughly 30–100 MB depending on the camera settings.
const MAX_VIDEO_SECONDS = 70
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export type MediaKind = 'image' | 'video' | 'audio'

// What gets stored for one attachment, ready for the photos table.
export interface Prepared {
  kind: MediaKind
  blob: Blob
  thumb?: Blob
  duration?: number
}

function toJpeg(source: CanvasImageSource, width: number, height: number, max: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać obrazka'))), 'image/jpeg', quality),
  )
}

// Phone photos are several MB each; shrink them before storing on the device.
export async function compressPhoto(file: Blob): Promise<Prepared> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const [blob, thumb] = await Promise.all([
      toJpeg(bitmap, bitmap.width, bitmap.height, FULL_SIZE, 0.82),
      toJpeg(bitmap, bitmap.width, bitmap.height, THUMB_SIZE, 0.7),
    ])
    return { kind: 'image', blob, thumb }
  } finally {
    bitmap.close()
  }
}

// Waits for one media event. Safari can leave an off-screen element without
// ever firing it, so give up after a while instead of hanging the picker.
function once(target: EventTarget, ok: string, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => () => {
      clearTimeout(timer)
      target.removeEventListener(ok, onOk)
      target.removeEventListener('error', onFail)
      fn()
    }
    const onOk = done(resolve)
    const onFail = done(() => reject(new Error('media')))
    const timer = setTimeout(onFail, timeoutMs)
    target.addEventListener(ok, onOk)
    target.addEventListener('error', onFail)
  })
}

async function mediaDuration(el: HTMLMediaElement): Promise<number> {
  await once(el, 'loadedmetadata')
  // Recordings from MediaRecorder can report Infinity until the end is sought.
  if (!Number.isFinite(el.duration)) {
    el.currentTime = 1e9
    await once(el, 'durationchange', 3000).catch(() => undefined)
  }
  return Number.isFinite(el.duration) ? el.duration : 0
}

async function prepareVideo(file: Blob): Promise<Prepared> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error('Film jest za duży (najwyżej 100 MB). Wybierz krótszy.')
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  try {
    let duration: number
    try {
      duration = await mediaDuration(video)
    } catch {
      throw new Error('Nie udało się odczytać filmu.')
    }
    if (duration > MAX_VIDEO_SECONDS) throw new Error('Film może trwać najwyżej minutę. Przytnij go w Zdjęciach i dodaj jeszcze raz.')
    // A frame a little way in, since the very first one is often black.
    let thumb: Blob | undefined
    try {
      video.currentTime = Math.min(0.5, duration / 2)
      await once(video, 'seeked', 5000)
      if (video.videoWidth) thumb = await toJpeg(video, video.videoWidth, video.videoHeight, THUMB_SIZE, 0.7)
    } catch {
      // No preview frame: the list shows a plain film tile instead.
    }
    return { kind: 'video', blob: file, thumb, duration }
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}

async function prepareAudio(file: Blob, knownDuration?: number): Promise<Prepared> {
  if (knownDuration !== undefined) return { kind: 'audio', blob: file, duration: knownDuration }
  const url = URL.createObjectURL(file)
  const audio = new Audio()
  audio.preload = 'metadata'
  audio.src = url
  try {
    const duration = await mediaDuration(audio).catch(() => 0)
    return { kind: 'audio', blob: file, duration }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function prepareMedia(file: Blob, duration?: number): Promise<Prepared> {
  if (file.type.startsWith('video/')) return prepareVideo(file)
  if (file.type.startsWith('audio/')) return prepareAudio(file, duration)
  if (file.type.startsWith('image/') || !file.type) return compressPhoto(file)
  return Promise.reject(new Error('Można dodać tylko zdjęcie, film albo nagranie.'))
}

export function formatDuration(seconds = 0): string {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
