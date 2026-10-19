const CACHE_NAME = "notevault-shell-v1";
const SHELL_FILES = ["/", "/manifest.webmanifest", "/notevault-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname === "/") {
    event.respondWith(
      caches.match("/").then((cached) => cached || fetch(request)),
    );
    return;
  }

  const staticFile =
    ["script", "style", "font", "image"].includes(request.destination) ||
    url.pathname === "/manifest.webmanifest";
  if (!staticFile) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic")
        await cache.put(request, response.clone());
      return response;
    }),
  );
});
