import type { Entry, EntryType } from '../db'

export const BULLET: Record<EntryType, string> = { task: '•', event: '○', note: '–' }
export const TYPE_LABEL: Record<EntryType, string> = { task: 'Zadanie', event: 'Wydarzenie', note: 'Notatka' }

const STATUS_MARK: Partial<Record<Entry['status'], string>> = {
  done: '×',
  migrated: '>',
  scheduled: '<',
}

export function bulletFor(entry: Entry): string {
  return (entry.type === 'task' && STATUS_MARK[entry.status]) || BULLET[entry.type]
}
