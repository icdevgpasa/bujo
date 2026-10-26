import { db, kindOf, type Entry, type Habit, type Photo } from './db'
import { dayKey } from './dates'
import type { MediaKind } from './media'
import { isZip, unzipBlobs, zipBlobs } from './zip'

const FORMAT = 'bujo-backup'
// v1: JSON with photos as data URLs. v2: adds habits. v3: a ZIP holding
// bujo.json plus every photo, film and recording as its own file.
const VERSION = 3
const MANIFEST = 'bujo.json'
const LAST_BACKUP_KEY = 'bujo:lastBackup'

// v1/v2: attachments inlined as data URLs.
interface InlinePhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string
  thumb?: string
}

// v3: attachments as files next to the manifest.
interface FilePhoto extends Omit<Photo, 'blob' | 'thumb'> {
  file: string
  type: string
  thumbFile?: string
}

interface BackupFile<P> {
  format: typeof FORMAT
  version: number
  createdAt: number
  entries: Entry[]
  photos: P[]
  habits?: Habit[]
}

export interface BackupSummary {
  entries: number
  media: MediaKind[]
  createdAt: number
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'video/webm': 'webm',
}

function extensionFor(type: string): string {
  return EXTENSIONS[type.split(';')[0]] ?? 'bin'
}

export async function createBackup(): Promise<File> {
  const [entries, photos, habits] = await Promise.all([db.entries.toArray(), db.photos.toArray(), db.habits.toArray()])
  const files: { name: string; data: Blob }[] = []
  const listed: FilePhoto[] = photos.map(({ blob, thumb, ...rest }) => {
    const file = `media/${rest.id}.${extensionFor(blob.type)}`
    files.push({ name: file, data: blob })
    const thumbFile = thumb ? `media/${rest.id}-miniatura.jpg` : undefined
    if (thumb && thumbFile) files.push({ name: thumbFile, data: thumb })
    return { ...rest, file, type: blob.type, thumbFile }
  })
  const manifest: BackupFile<FilePhoto> = { format: FORMAT, version: VERSION, createdAt: Date.now(), entries, habits, photos: listed }
  const zip = await zipBlobs([{ name: MANIFEST, data: new Blob([JSON.stringify(manifest)], { type: 'application/json' }) }, ...files])
  return new File([zip], `bujo-kopia-${dayKey()}.zip`, { type: 'application/zip' })
}

// iOS has no real downloads folder in a home-screen app; the share sheet's
// "Save to Files" is the dependable way out. Elsewhere fall back to a download.
// Safari only opens the share sheet inside a fresh tap, and building the file
// can outlast it; 'needs-tap' asks the caller for a second tap on the ready file.
export async function saveBackup(file: File): Promise<'shared' | 'downloaded' | 'cancelled' | 'needs-tap'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name })
      markBackedUp()
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      if (err instanceof DOMException && err.name === 'NotAllowedError') return 'needs-tap'
      throw err
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  markBackedUp()
  return 'downloaded'
}

const NOT_A_BACKUP = 'To nie jest plik kopii Bujo.'

function validate<P>(data: BackupFile<P> | undefined): BackupFile<P> {
  if (data?.format !== FORMAT || !Array.isArray(data.entries) || !Array.isArray(data.photos)) throw new Error(NOT_A_BACKUP)
  if (data.version > VERSION) {
    throw new Error('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  }
  return data
}

async function parse<P>(blob: Blob | undefined): Promise<BackupFile<P>> {
  let data
  try {
    data = JSON.parse(await blob!.text())
  } catch {
    throw new Error(NOT_A_BACKUP)
  }
  return validate<P>(data)
}

// Reads the manifest and returns a restore step that builds every Blob
// before it touches the database, so a bad file changes nothing.
async function open(file: Blob): Promise<{ data: BackupFile<unknown>; photos: () => Promise<Photo[]> }> {
  if (!(await isZip(file))) {
    // v1/v2 JSON files.
    const data = await parse<InlinePhoto>(file)
    return {
      data,
      photos: () =>
        Promise.all(
          data.photos.map(async (p) => ({
            ...p,
            blob: await dataUrlToBlob(p.blob),
            thumb: p.thumb ? await dataUrlToBlob(p.thumb) : undefined,
          })),
        ),
    }
  }
  let files: Map<string, Blob>
  try {
    files = await unzipBlobs(file)
  } catch {
    throw new Error(NOT_A_BACKUP)
  }
  const data = await parse<FilePhoto>(files.get(MANIFEST))
  return {
    data,
    photos: async () =>
      data.photos.map(({ file: name, type, thumbFile, ...rest }) => {
        const blob = files.get(name)
        const thumb = thumbFile ? files.get(thumbFile) : undefined
        if (!blob) throw new Error('W kopii brakuje pliku. Kopia jest niepełna albo uszkodzona.')
        // Re-type the slices, so films and recordings play back after restore.
        return { ...rest, blob: new Blob([blob], { type }), thumb: thumb && new Blob([thumb], { type: 'image/jpeg' }) }
      }),
  }
}

export async function readBackup(file: Blob): Promise<{ summary: BackupSummary; restore: () => Promise<void> }> {
  const { data, photos: loadPhotos } = await open(file)
  return {
    summary: {
      entries: data.entries.length,
      media: (data.photos as Pick<Photo, 'kind'>[]).map(kindOf),
      createdAt: data.createdAt,
    },
    restore: async () => {
      const photos = await loadPhotos()
      await db.transaction('rw', db.entries, db.photos, db.habits, async () => {
        await db.entries.clear()
        await db.photos.clear()
        await db.habits.clear()
        await db.entries.bulkPut(data.entries)
        await db.photos.bulkPut(photos)
        await db.habits.bulkPut(data.habits ?? [])
      })
    },
  }
}

export function markBackedUp() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    // Private mode or blocked storage: the reminder just keeps showing.
  }
}

export function lastBackupAt(): number | undefined {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return value > 0 ? value : undefined
  } catch {
    return undefined
  }
}

const REMIND_AFTER_DAYS = 14

export function backupIsDue(entryCount: number): boolean {
  if (entryCount === 0) return false
  const last = lastBackupAt()
  return !last || Date.now() - last > REMIND_AFTER_DAYS * 24 * 60 * 60 * 1000
}
