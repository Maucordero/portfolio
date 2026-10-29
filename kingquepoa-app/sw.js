/* King Quepoa · app del celular
   Guarda la app para que abra sin internet.
   Los datos del inventario los maneja la propia app (localStorage). */

const CACHE = 'kq-app-v34';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './logo-gracias.png',
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Google (catálogo y movimientos) siempre va a la red.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) return;
  if (e.request.method !== 'GET') return;

  // La app siempre se busca en la red (para recibir mejoras); si no hay, usa la copia.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cacheado => {
      const red = fetch(e.request).then(resp => {
        if (resp && resp.ok && url.origin === location.origin) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return resp;
      }).catch(() => cacheado);
      return cacheado || red;
    })
  );
});
