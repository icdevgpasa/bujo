import { alarmLabel } from '../reminders'
import { useState } from 'preact/hooks'
import { db, kindOf, updateEntry, type Entry, type Photo } from '../db'
import { formatDuration } from '../media'
import { useLiveQuery } from '../useLiveQuery'
import { bulletFor } from './bullets'
import { placeholderFor } from './attachments'
import { BlobImage } from './BlobImage'
import { EntryActions } from './EntryActions'
import { MediaViewer } from './MediaViewer'

// Photos and films are taped onto the page; a voice note is a small tab.
function Tile({ item, onOpen }: { item: Photo; onOpen: () => void }) {
  const kind = kindOf(item)
  if (kind === 'audio')
    return (
      <button type="button" class="voice" aria-label={`Odtwórz nagranie, ${formatDuration(item.duration)}`} onClick={onOpen}>
        <span aria-hidden="true">▶</span> {formatDuration(item.duration)}
      </button>
    )
  return (
    <button type="button" class={`thumb ${kind}`} aria-label={kind === 'video' ? 'Odtwórz film' : 'Pokaż zdjęcie'} onClick={onOpen}>
      {item.thumb ? <BlobImage blob={item.thumb} /> : <span class="thumb-blank" />}
      {kind === 'video' && (
        <span class="film-badge" aria-hidden="true">▶ {formatDuration(item.duration)}</span>
      )}
    </button>
  )
}

export function EntryList({ entries, empty }: { entries: Entry[] | undefined; empty?: string }) {
  const ids = entries?.map((e) => e.id) ?? []
  const photos = useLiveQuery(() => db.photos.where('entryId').anyOf(ids).sortBy('createdAt'), [ids.join(',')])
  const [open, setOpen] = useState<Entry>()
  const [viewing, setViewing] = useState<Photo>()

  if (!entries) return null
  if (!entries.length) return empty ? <p class="empty">{empty}</p> : null

  const toggle = (entry: Entry) => {
    if (entry.type !== 'task') return setOpen(entry)
    if (entry.status === 'open') updateEntry(entry.id, { status: 'done' })
    else if (entry.status === 'done') updateEntry(entry.id, { status: 'open' })
    else setOpen(entry)
  }

  return (
    <>
      <ul class="log">
        {entries.map((entry) => {
          const own = photos?.filter((p) => p.entryId === entry.id) ?? []
          return (
            <li key={entry.id} class={`entry ${entry.type} ${entry.status}`}>
              <button
                type="button"
                class="bullet"
                aria-label={entry.type === 'task' ? (entry.status === 'done' ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione') : 'Opcje wpisu'}
                onClick={() => toggle(entry)}
              >
                {bulletFor(entry)}
              </button>
              <div class="body">
                <button type="button" class="text" onClick={() => setOpen(entry)}>
                  {entry.star && entry.status === 'open' && <span class="star" aria-label="Najważniejsze">⭐ </span>}
                  {entry.text || <span class="muted">{placeholderFor(own.map(kindOf))}</span>}
                  {entry.remindAt && <span class="remind" title="Przypomnienie w Kalendarzu"> 🔔 {alarmLabel(entry.remindAt, entry.log === 'daily' ? entry.key : undefined)}</span>}
                </button>
                {own.length > 0 && (
                  <div class="thumbs">
                    {own.map((p) => (
                      <Tile key={p.id} item={p} onOpen={() => setViewing(p)} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {open && <EntryActions entry={entries.find((e) => e.id === open.id) ?? open} onClose={() => setOpen(undefined)} />}
      {viewing && <MediaViewer item={viewing} onClose={() => setViewing(undefined)} />}
    </>
  )
}
