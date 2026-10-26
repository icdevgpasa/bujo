# Bujo

Bullet Journal jako aplikacja PWA działająca w pełni offline. Dane (wpisy, zdjęcia, filmy i nagrania głosowe) zostają tylko na urządzeniu, w IndexedDB przeglądarki. Nie ma kont ani synchronizacji.

## Technologia

- [Vite](https://vite.dev) + TypeScript + [Preact](https://preactjs.com)
- [Dexie](https://dexie.org) (IndexedDB) na wpisy i załączniki
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) (service worker, manifest, instalacja na ekranie głównym)
- Hosting: GitHub Pages, wdrażany automatycznie po każdym pushu na `main`

## Uruchomienie lokalnie

```sh
npm install
npm run dev      # serwer deweloperski
npm run build    # build produkcyjny do dist/
npm run preview  # podgląd buildu (z działającym service workerem)
```

## Instalacja na telefonie

Otwórz adres aplikacji w przeglądarce, potem:

- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.
- **iPhone (Safari):** przycisk Udostępnij → „Do ekranu początkowego”.

Każda osoba instaluje aplikację na swoim telefonie i ma własne, niezależne dane.

## Załączniki i kopia zapasowa

Do wpisu można dodać zdjęcia, filmy (do ok. 1 minuty i 100 MB) oraz notatki głosowe nagrane w aplikacji. Zdjęcia są zmniejszane, filmy i nagrania zapisywane bez zmian.

Kopia zapasowa to plik ZIP: `bujo.json` z wpisami i nawykami oraz katalog `media/` z każdym załącznikiem jako osobnym plikiem. Starsze kopie w formacie JSON nadal da się przywrócić.

## Indeks

Zakładka Indeks ma wyszukiwarkę po wszystkich wpisach (bez względu na wielkość liter i polskie znaki) oraz kolekcje, czyli strony na listy bez daty, np. książki do przeczytania.
