# Bujo

Bullet Journal jako aplikacja PWA działająca w pełni offline. Dane (wpisy i zdjęcia) zostają tylko na urządzeniu, w IndexedDB przeglądarki. Nie ma kont ani synchronizacji.

## Technologia

- [Vite](https://vite.dev) + TypeScript + [Preact](https://preactjs.com)
- [Dexie](https://dexie.org) (IndexedDB) na wpisy i zdjęcia
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
