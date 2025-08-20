const CACHE_NAME = 'dme-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/painel.html',
  '/css/login.css',
  '/css/style.css',
  '/js/script.js',
  '/js/supabaseClient.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm',
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap',
  // ATENÇÃO: Verifique no DevTools (aba Network) se há outras fontes ou recursos de CDN que precisam ser cacheados.
  // Estes são exemplos comuns:
  'https://fonts.gstatic.com/s/opensans/v29/memvYaGs126MiZpBA-tsUFWb.woff2', /* Exemplo de fonte, pode precisar de mais */
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2', /* Exemplo de fonte awesome, pode precisar de mais */
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});