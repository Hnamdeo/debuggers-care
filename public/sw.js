// Service worker: lets the app install on phones and computers and open fast.
// Pages always come from the network first (so a new version shows at once); the
// built files in /assets/ never change once published, so they are kept on the device.
// Patient data (/api/) is never stored here.
// At install it also keeps every file the app needs, so the app still opens with the internet down.
const CACHE = 'care-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    try {
      const res = await fetch('/', { cache: 'no-store' })
      const html = await res.clone().text()
      await c.put('/', res)
      const files = [...new Set([...html.matchAll(/(?:src|href)="(\/(?:assets|icons)\/[^"]+)"/g)].map((m) => m[1]))]
      await c.addAll([...files, '/icons/icon-192.png'])
    } catch {}
  }))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)) }
        return res
      }).catch(() => caches.match('/').then((r) => r || Response.error())),
    )
    return
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
        return res
      })),
    )
  }
})
