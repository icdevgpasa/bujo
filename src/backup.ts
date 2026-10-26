import { db, type Entry, type Photo } from './db'
import { dayKey } from './dates'

const FORMAT = 'bujo-backup'
const VERSION = 1
const LAST_BACKUP_KEY = 'bujo:lastBackup'

interface BackupPhoto extends Omit<Photo, 'blob' | 'thumb'> {
  blob: string
  thumb: string
}

interface BackupFile {
  format: typeof FORMAT
  version: number
  createdAt: number
  entries: Entry[]
  photos: BackupPhoto[]
}

export interface BackupSummary {
  entries: number
  photos: number
  createdAt: number
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}

// One self-contained JSON file: entries as-is, photos inlined as data URLs.
export async function createBackup(): Promise<File> {
  const [entries, photos] = await Promise.all([db.entries.toArray(), db.photos.toArray()])
  const backup: BackupFile = {
    format: FORMAT,
    version: VERSION,
    createdAt: Date.now(),
    entries,
    photos: await Promise.all(
      photos.map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob), thumb: await blobToDataUrl(p.thumb) })),
    ),
  }
  return new File([JSON.stringify(backup)], `bujo-kopia-${dayKey()}.json`, { type: 'application/json' })
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

export async function readBackup(file: Blob): Promise<{ summary: BackupSummary; restore: () => Promise<void> }> {
  let data: BackupFile
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('To nie jest plik kopii Bujo.')
  }
  if (data?.format !== FORMAT || !Array.isArray(data.entries) || !Array.isArray(data.photos)) {
    throw new Error('To nie jest plik kopii Bujo.')
  }
  if (data.version > VERSION) {
    throw new Error('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  }
  return {
    summary: { entries: data.entries.length, photos: data.photos.length, createdAt: data.createdAt },
    restore: async () => {
      // Decode every photo before touching the database so a bad file changes nothing.
      const photos: Photo[] = await Promise.all(
        data.photos.map(async (p) => ({ ...p, blob: await dataUrlToBlob(p.blob), thumb: await dataUrlToBlob(p.thumb) })),
      )
      await db.transaction('rw', db.entries, db.photos, async () => {
        await db.entries.clear()
        await db.photos.clear()
        await db.entries.bulkPut(data.entries)
        await db.photos.bulkPut(photos)
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
