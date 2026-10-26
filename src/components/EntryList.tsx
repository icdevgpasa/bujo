import { useState } from 'preact/hooks'
import { db, updateEntry, type Entry, type Photo } from '../db'
import { useLiveQuery } from '../useLiveQuery'
import { bulletFor } from './bullets'
import { BlobImage } from './BlobImage'
import { EntryActions } from './EntryActions'
import { PhotoViewer } from './PhotoViewer'

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
                  {entry.text || <span class="muted">(zdjęcie)</span>}
                </button>
                {own.length > 0 && (
                  <div class="thumbs">
                    {own.map((p) => (
                      <button type="button" key={p.id} class="thumb" aria-label="Pokaż zdjęcie" onClick={() => setViewing(p)}>
                        <BlobImage blob={p.thumb} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {open && <EntryActions entry={entries.find((e) => e.id === open.id) ?? open} onClose={() => setOpen(undefined)} />}
      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(undefined)} />}
    </>
  )
}
