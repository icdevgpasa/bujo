import { useState } from 'preact/hooks'
import { Composer } from '../components/Composer'
import { EntryList } from '../components/EntryList'
import { Sheet } from '../components/Sheet'
import { addEntry, collectionKey, db, deleteCollection, entriesFor, renameCollection, type Collection } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'

function CollectionSheet({ collection, count, onClose }: { collection: Collection; count: number; onClose: () => void }) {
  const [name, setName] = useState(collection.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <Sheet onClose={onClose} label={`Kolekcja: ${collection.name}`}>
      <p class="sheet-title">
        <span class="muted">Kolekcja</span>
        <br />
        {collection.name}
      </p>
      <form
        class="edit"
        onSubmit={async (e) => {
          e.preventDefault()
          if (name.trim()) await renameCollection(collection.id, name.trim())
          onClose()
        }}
      >
        <input class="habit-name" value={name} onInput={(e) => setName(e.currentTarget.value)} aria-label="Nazwa kolekcji" maxLength={40} />
        <div class="row">
          <button type="submit" class="primary">Zapisz nazwę</button>
        </div>
      </form>
      <div class="actions">
        <button
          type="button"
          class={confirmDelete ? 'danger' : ''}
          onClick={async () => {
            if (!confirmDelete) return setConfirmDelete(true)
            await deleteCollection(collection.id)
            location.hash = href.index()
          }}
        >
          {confirmDelete ? (count ? 'Na pewno usunąć kolekcję razem z wpisami?' : 'Na pewno usunąć kolekcję?') : 'Usuń kolekcję'}
        </button>
        <button type="button" onClick={onClose}>Zamknij</button>
      </div>
    </Sheet>
  )
}

export function CollectionView({ id }: { id: number }) {
  const key = collectionKey(id)
  // null once loaded and missing, undefined while loading.
  const collection = useLiveQuery(async () => (await db.collections.get(id)) ?? null, [id])
  const entries = useLiveQuery(() => entriesFor('collection', key), [key])
  const [editing, setEditing] = useState(false)

  if (collection === null)
    return (
      <>
        <header class="page-header">
          <h1>Indeks</h1>
        </header>
        <p class="empty">Tej kolekcji już nie ma.</p>
        <a class="back-today" href={href.index()}>Wróć do indeksu</a>
      </>
    )

  return (
    <>
      <header class="page-header">
        <a href={href.index()} aria-label="Indeks">‹</a>
        <h1>
          <button type="button" class="title-button" onClick={() => setEditing(true)} aria-label={`${collection?.name ?? ''}, zmień nazwę lub usuń`}>
            {collection?.name ?? ''}
          </button>
        </h1>
        <span class="header-spacer" />
      </header>
      <EntryList entries={entries} empty="Pusta strona. Dopisz pierwszą pozycję na dole." />
      <Composer onSubmit={(type, text, media) => addEntry('collection', key, type, text, media)} />
      {editing && collection && <CollectionSheet collection={collection} count={entries?.length ?? 0} onClose={() => setEditing(false)} />}
    </>
  )
}
