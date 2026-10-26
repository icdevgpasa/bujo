import Dexie, { type EntityTable } from 'dexie'
import { compressPhoto } from './photos'

export type EntryType = 'task' | 'event' | 'note'
export type EntryStatus = 'open' | 'done' | 'migrated' | 'scheduled' | 'cancelled'
// daily: key = YYYY-MM-DD, monthly/future: key = YYYY-MM
export type LogKind = 'daily' | 'monthly' | 'future'

export interface Entry {
  id: number
  log: LogKind
  key: string
  type: EntryType
  status: EntryStatus
  text: string
  createdAt: number
  updatedAt: number
  // Set on the copy created by migration, pointing at the original entry.
  from?: number
}

export interface Photo {
  id: number
  entryId: number
  blob: Blob
  thumb: Blob
  createdAt: number
}

export const db = new Dexie('bujo') as Dexie & {
  entries: EntityTable<Entry, 'id'>
  photos: EntityTable<Photo, 'id'>
}

db.version(1).stores({
  entries: '++id, [log+key], status, createdAt',
  photos: '++id, entryId',
})

export function entriesFor(log: LogKind, key: string) {
  return db.entries.where('[log+key]').equals([log, key]).sortBy('createdAt')
}

export function entriesBetween(log: LogKind, fromKey: string, toKey: string) {
  return db.entries.where('[log+key]').between([log, fromKey], [log, toKey], true, true).sortBy('createdAt')
}

// Open tasks left behind in daily logs before the given day.
export function pendingTasks(beforeDay: string) {
  return db.entries
    .where('[log+key]')
    .between(['daily', ''], ['daily', beforeDay], true, false)
    .filter((e) => e.type === 'task' && e.status === 'open')
    .sortBy('key')
}

export async function addEntry(log: LogKind, key: string, type: EntryType, text: string, files: Blob[] = []) {
  // Compress before the transaction: IndexedDB transactions close on unrelated awaits.
  const photos = await Promise.all(files.map(compressPhoto))
  const now = Date.now()
  return db.transaction('rw', db.entries, db.photos, async () => {
    const id = await db.entries.add({ log, key, type, text, status: 'open', createdAt: now, updatedAt: now })
    await db.photos.bulkAdd(photos.map((p) => ({ entryId: id, ...p, createdAt: now })))
    return id
  })
}

export async function addPhotos(entryId: number, files: Blob[]) {
  const photos = await Promise.all(files.map(compressPhoto))
  const now = Date.now()
  await db.photos.bulkAdd(photos.map((p) => ({ entryId, ...p, createdAt: now })))
}

export function updateEntry(id: number, patch: Partial<Pick<Entry, 'text' | 'status' | 'type'>>) {
  return db.entries.update(id, { ...patch, updatedAt: Date.now() })
}

export function deleteEntry(id: number) {
  return db.transaction('rw', db.entries, db.photos, async () => {
    await db.photos.where('entryId').equals(id).delete()
    await db.entries.delete(id)
  })
}

export function deletePhoto(id: number) {
  return db.photos.delete(id)
}

// Bullet Journal migration: the original is marked > (forward) or < (into the
// future log) and an open copy is written to the target log. Photos stay with
// the original.
export function migrateEntry(entry: Entry, log: LogKind, key: string) {
  const now = Date.now()
  return db.transaction('rw', db.entries, async () => {
    await db.entries.update(entry.id, { status: log === 'future' ? 'scheduled' : 'migrated', updatedAt: now })
    await db.entries.add({
      log,
      key,
      type: entry.type,
      text: entry.text,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      from: entry.id,
    })
  })
}

// Ask the browser not to evict our data under storage pressure.
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
