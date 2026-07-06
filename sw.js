const CACHE = "performance-ibrida-v1-3";
const ASSETS = [
  "./",
  "./index.html?v=1.3",
  "./style.css?v=1.3",
  "./app.js?v=1.3",
  "./data.js?v=1.3",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(()=>{})));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match(req).then(cached => cached || caches.match("./index.html?v=1.3")))
  );
});
