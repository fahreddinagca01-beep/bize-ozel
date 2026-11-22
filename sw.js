// Çevrim dışı çalışma: ağ varsa güncel dosya gelir ve önbelleğe yazılır; ağ yoksa önbellek kullanılır.
// Kod veya içerik değişince CACHE sürümünü artır.
var CACHE = "bize-ozel-v12";
var FILES = ["./", "index.html", "style.css", "app.js", "games.js", "kalp.js", "soru.js", "bugun.js", "surpriz.js", "posta.js", "icerik.enc.json", "manifest.webmanifest", "icon.svg", "bize-180.png", "bize-192.png", "bize-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.hostname === "ntfy.sh") return; // canlı kalp akışı önbelleğe alınmaz
  var req = url.origin === location.origin ? fetch(e.request.url, { cache: "no-cache" }) : fetch(e.request);
  e.respondWith(req.then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
