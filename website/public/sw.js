const CACHE_NAME = 'recall-v1'
const urlsToCache = [
  '/',
  '/docs',
  '/docs/quickstart',
  '/_next/static/css/',
  '/_next/static/js/',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})