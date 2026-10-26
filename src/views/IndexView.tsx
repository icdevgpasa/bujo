import { useState } from 'preact/hooks'
import { bulletFor } from '../components/bullets'
import { formatDay, formatMonth } from '../dates'
import { addCollection, collectionKey, db, searchEntries, type Collection, type Entry } from '../db'
import { href } from '../router'
import { useLiveQuery } from '../useLiveQuery'

// Kept outside the component, so coming back from a result shows it again.
let lastQuery = ''

function placeOf(entry: Entry, collections: Collection[]): { label: string; link: string } {
  switch (entry.log) {
    case 'daily':
      return { label: formatDay(entry.key), link: href.day(entry.key) }
    case 'monthly':
      return { label: formatMonth(entry.key), link: href.month(entry.key) }
    case 'future':
      return { label: `Przyszły log, ${formatMonth(entry.key)}`, link: href.future() }
    case 'collection': {
      const c = collections.find((x) => collectionKey(x.id) === entry.key)
      return { label: c?.name ?? 'Kolekcja', link: href.collection(Number(entry.key)) }
    }
  }
}

export function IndexView() {
  const [query, setQuery] = useState(lastQuery)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const collections = useLiveQuery(() => db.collections.orderBy('id').toArray(), [])
  const counts = useLiveQuery(
    async () => {
      const keys = (await db.entries.where('[log+key]').between(['collection', ''], ['collection', '￿']).toArray()).map((e) => e.key)
      return new Map(keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>()))
    },
    [],
  )
  const results = useLiveQuery(() => searchEntries(query), [query])

  const search = (value: string) => {
    lastQuery = value
    setQuery(value)
  }

  const create = async (e: Event) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = await addCollection(name.trim())
    setName('')
    setAdding(false)
    location.hash = href.collection(id)
  }

  return (
    <>
      <header class="page-header">
        <h1>Indeks</h1>
      </header>

      <div class="search-box">
        <input
          class="search"
          type="search"
          value={query}
          onInput={(e) => search(e.currentTarget.value)}
          placeholder="Szukaj we wpisach…"
          aria-label="Szukaj we wpisach"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" class="search-clear" aria-label="Wyczyść wyszukiwanie" title="Wyczyść" onClick={() => search('')}>
            ✕
          </button>
        )}
      </div>

      {query.trim() ? (
        <section>
          <h2>Znalezione</h2>
          {results?.length === 0 && <p class="empty">Nic nie pasuje do „{query.trim()}”.</p>}
          <ul class="results">
            {results?.map((entry) => {
              const place = placeOf(entry, collections ?? [])
              return (
                <li key={entry.id}>
                  <a href={place.link} class={`entry ${entry.type} ${entry.status}`}>
                    <span class="bullet" aria-hidden="true">{bulletFor(entry)}</span>
                    <span class="result-body">
                      <span class="text">{entry.text}</span>
                      <span class="place">{place.label}</span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ) : (
        <section>
          <div class="section-head">
            <h2>Kolekcje</h2>
            {!adding && (
              <button type="button" class="quiet-link" onClick={() => setAdding(true)}>+ nowa</button>
            )}
          </div>
          {adding && (
            <form class="habit-add" onSubmit={create}>
              <input value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="np. Książki do przeczytania" aria-label="Nazwa kolekcji" maxLength={40} autoFocus />
              <button type="submit">Dodaj</button>
            </form>
          )}
          {collections?.length === 0 && !adding && (
            <p class="empty">Kolekcja to strona na listę bez daty: książki do przeczytania, pomysły na prezenty, filmy do obejrzenia.</p>
          )}
          <ul class="collections">
            {collections?.map((c) => (
              <li key={c.id}>
                <a href={href.collection(c.id)}>
                  <span class="name">{c.name}</span>
                  <span class="count">{counts?.get(collectionKey(c.id)) ?? 0}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
