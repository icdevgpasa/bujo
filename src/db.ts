import Dexie, { type EntityTable } from 'dexie'
import type { MediaKind, Prepared } from './media'

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

// An attachment. The table predates audio and video, hence the name; rows
// without a kind are photos.
export interface Photo {
  id: number
  entryId: number
  kind?: MediaKind
  blob: Blob
  // Missing for audio, and for a video whose preview frame could not be read.
  thumb?: Blob
  // Seconds, for audio and video.
  duration?: number
  createdAt: number
}

export function kindOf(p: Pick<Photo, 'kind'>): MediaKind {
  return p.kind ?? 'image'
}

// A habit belongs to one month, like a tracker drawn on that month's page;
// done holds the days of the month (1–31) it was kept.
export interface Habit {
  id: number
  month: string
  name: string
  order: number
  done: number[]
  createdAt: number
}

export const db = new Dexie('bujo') as Dexie & {
  entries: EntityTable<Entry, 'id'>
  photos: EntityTable<Photo, 'id'>
  habits: EntityTable<Habit, 'id'>
}

db.version(1).stores({
  entries: '++id, [log+key], status, createdAt',
  photos: '++id, entryId',
})
db.version(2).stores({
  habits: '++id, month',
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

// Attachments arrive already prepared (see media.ts): IndexedDB transactions
// close on unrelated awaits, so no compressing happens in here.
export function addEntry(log: LogKind, key: string, type: EntryType, text: string, media: Prepared[] = []) {
  const now = Date.now()
  return db.transaction('rw', db.entries, db.photos, async () => {
    const id = await db.entries.add({ log, key, type, text, status: 'open', createdAt: now, updatedAt: now })
    await db.photos.bulkAdd(media.map((m) => ({ entryId: id, ...m, createdAt: now })))
    return id
  })
}

export async function addMedia(entryId: number, media: Prepared[]) {
  const now = Date.now()
  await db.photos.bulkAdd(media.map((m) => ({ entryId, ...m, createdAt: now })))
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
// future log) and an open copy is written to the target log. Photos move to
// the copy, since that is the task you carry on with; the old page keeps only
// the > or < mark.
export function migrateEntry(entry: Entry, log: LogKind, key: string) {
  const now = Date.now()
  return db.transaction('rw', db.entries, db.photos, async () => {
    await db.entries.update(entry.id, { status: log === 'future' ? 'scheduled' : 'migrated', updatedAt: now })
    const copyId = await db.entries.add({
      log,
      key,
      type: entry.type,
      text: entry.text,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      from: entry.id,
    })
    await db.photos.where('entryId').equals(entry.id).modify({ entryId: copyId })
  })
}

export const MAX_HABITS = 6

export function habitsFor(month: string) {
  return db.habits.where('month').equals(month).sortBy('order')
}

export function addHabit(month: string, name: string) {
  return db.transaction('rw', db.habits, async () => {
    const existing = await db.habits.where('month').equals(month).toArray()
    if (existing.length >= MAX_HABITS) throw new Error(`Zmieści się najwyżej ${MAX_HABITS} nawyków.`)
    const order = Math.max(0, ...existing.map((h) => h.order + 1))
    await db.habits.add({ month, name, order, done: [], createdAt: Date.now() })
  })
}

export function toggleHabit(habit: Habit, day: number) {
  const done = habit.done.includes(day) ? habit.done.filter((d) => d !== day) : [...habit.done, day].sort((a, b) => a - b)
  return db.habits.update(habit.id, { done })
}

export function renameHabit(id: number, name: string) {
  return db.habits.update(id, { name })
}

export function deleteHabit(id: number) {
  return db.habits.delete(id)
}

// A new month starts with last month's habits, unticked, the way you'd copy
// the tracker onto a fresh spread. Only for this month and later, so paging
// back through old months doesn't fill them in, and only once per month, so
// clearing a month's habits on purpose sticks.
export async function carryOverHabits(month: string, previousMonth: string, currentMonth: string) {
  if (month < currentMonth) return
  const marker = `bujo:habitsCarried:${month}`
  try {
    if (localStorage.getItem(marker)) return
  } catch {
    // Storage blocked: fall back to the "month is empty" check alone.
  }
  await db.transaction('rw', db.habits, async () => {
    if ((await db.habits.where('month').equals(month).count()) > 0) return
    const previous = await db.habits.where('month').equals(previousMonth).sortBy('order')
    const now = Date.now()
    await db.habits.bulkAdd(previous.map((h) => ({ month, name: h.name, order: h.order, done: [], createdAt: now })))
  })
  try {
    localStorage.setItem(marker, '1')
  } catch {
    // See above.
  }
}

// Ask the browser not to evict our data under storage pressure.
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
