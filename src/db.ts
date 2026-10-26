import Dexie, { type EntityTable } from 'dexie'

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

export function todayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function addEntry(log: LogKind, key: string, type: EntryType, text: string) {
  const now = Date.now()
  return db.entries.add({ log, key, type, text, status: 'open', createdAt: now, updatedAt: now })
}

export async function setStatus(id: number, status: EntryStatus) {
  return db.entries.update(id, { status, updatedAt: Date.now() })
}

// Ask the browser not to evict our data under storage pressure.
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
