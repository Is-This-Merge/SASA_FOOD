const CACHE_NAME = "school-meals-v9";
const STATIC_CACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
const pendingMealRequests = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch("/", { cache: "reload" });
  if (!response.ok) throw new Error("App shell could not be downloaded");
  await cache.put("/", response.clone());

  const html = await response.text();
  const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/_next/static/"));
  const urls = [...new Set([...STATIC_CACHE.slice(1), ...assetUrls])];
  await Promise.allSettled(urls.map((url) => cache.add(url)));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(
    names
      .filter((name) => (name.startsWith("meal-cache-") || name.startsWith("school-meals-")) && name !== CACHE_NAME)
      .map((name) => caches.delete(name))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/api/meals" && url.searchParams.has("date")) {
    event.respondWith(handleMealRequest(request));
  } else if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
  } else if (url.pathname.startsWith("/_next/static/") || STATIC_CACHE.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || Response.error();
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function handleMealRequest(request) {
  const key = request.url;
  const pending = pendingMealRequests.get(key);
  if (pending) return (await pending).clone();

  const responsePromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })();

  pendingMealRequests.set(key, responsePromise);
  try {
    return (await responsePromise).clone();
  } finally {
    pendingMealRequests.delete(key);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "PREFETCH_DATE_RANGE" && Array.isArray(event.data.dates)) {
    event.waitUntil(prefetchMeals(event.data.dates));
  }
});

async function prefetchMeals(dates) {
  const cache = await caches.open(CACHE_NAME);
  const desiredDates = new Set(dates);
  const cachedRequests = await cache.keys();
  await Promise.all(cachedRequests.map((request) => {
    const url = new URL(request.url);
    const cachedDate = url.pathname === "/api/meals" ? url.searchParams.get("date") : null;
    return cachedDate && !desiredDates.has(cachedDate) ? cache.delete(request) : false;
  }));

  await Promise.all(dates.map(async (date) => {
    try {
      const response = await handleMealRequest(new Request(new URL(`/api/meals?date=${date}`, self.location.origin)));
      if (!response.ok) console.warn(`Meal API failed: ${date}`, response.status);
    } catch (error) {
      console.error(`Meal prefetch failed: ${date}`, error);
    }
  }));
}
