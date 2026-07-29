const CACHE_NAME = "bank-manager-shell-v17";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./assets/release/app-icon.png",
  "./assets/release/app-icon-192.png",
  "./assets/release/app-icon-512.png",
  "./assets/western/characters-atlas.png",
  "./assets/western/furniture-atlas.png",
  "./assets/office/cashiers-box.png",
  "./assets/office/grand-lobby.png",
  "./assets/office/pr-office.png",
  "./assets/office/risk-desk.png",
  "./assets/office/safe-deposit.png",
  "./assets/office/staff-quarters.png",
  "./assets/office/teller-window.png",
  "./assets/office/vault-upgrade.png",
  "./js/constants.js",
  "./js/platform.js",
  "./js/settings.js",
  "./js/controls.js",
  "./js/audio.js",
  "./js/economy.js",
  "./js/portfolio.js",
  "./js/world.js",
  "./js/market.js",
  "./js/campaign.js",
  "./js/achievements.js",
  "./js/operations.js",
  "./js/guidance.js",
  "./js/telemetry.js",
  "./js/bank.js",
  "./js/events.js",
  "./js/render.js",
  "./js/timers.js",
  "./js/floor.js",
  "./js/branch.js",
  "./js/management.js",
  "./js/strategy.js",
  "./js/help.js",
  "./js/game.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("bank-manager-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    })).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
  );
});
