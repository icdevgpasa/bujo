// Imported into the generated service worker (see vite.config.ts). Answers
// reminder.ics?d=<calendar text> with that text as a calendar file, so the
// iPhone offers "Add to Calendar" — offline too.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.pathname.endsWith('/reminder.ics')) return
  event.respondWith(
    new Response(url.searchParams.get('d') || '', {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="przypomnienie.ics"',
      },
    }),
  )
})
