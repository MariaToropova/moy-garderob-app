const CACHE = "wardrobe-shell-v1";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const SHELL = [`${BASE}/`, `${BASE}/manifest.webmanifest`, `${BASE}/icons/icon-192.png`, `${BASE}/icons/icon-512.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.pathname.startsWith("/api/") || url.hostname.includes("supabase")) return;
  if (request.destination === "image" && !url.pathname.includes("/wardrobe/")) return;
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(`${BASE}/`))));
});
