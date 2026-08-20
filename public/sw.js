// Must match the Cache Storage name used by MealPage.
const CACHE_NAME = "school-meals-v5";

const STATIC_CACHE = [
  "/",
];

// --------------------------------------------------
// Install
// --------------------------------------------------

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );

  self.skipWaiting();
});

// --------------------------------------------------
// Activate
// --------------------------------------------------

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              (name.startsWith("meal-cache-") ||
                name.startsWith("school-meals-")) &&
              name !== CACHE_NAME
          )
          .map((name) => caches.delete(name))
      );
    })
  );

  self.clients.claim();
});

// --------------------------------------------------
// Fetch
// --------------------------------------------------

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // GET만 처리
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // 같은 origin의 요청만 처리
  if (url.origin !== self.location.origin) {
    return;
  }

  // ------------------------------------------------
  // 급식 API만 캐시
  // ------------------------------------------------

  if (
    url.pathname === "/api/meals" &&
    url.searchParams.has("date")
  ) {
    event.respondWith(handleMealRequest(request));
    return;
  }

  // ------------------------------------------------
  // 나머지 요청은 Service Worker가 건드리지 않음
  // ------------------------------------------------

  // 리뷰 API도 여기서는 처리하지 않는다.
});

// --------------------------------------------------
// Meal API Cache
// --------------------------------------------------

async function handleMealRequest(request) {
  const cache = await caches.open(CACHE_NAME);

  const cachedResponse = await cache.match(request);

  // 캐시가 있으면 API 요청하지 않음
  if (cachedResponse) {
    return cachedResponse;
  }

  // 캐시가 없을 때만 실제 API 요청
  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error("Meal API request failed:", error);

    throw error;
  }
}

// --------------------------------------------------
// Month prefetch
// --------------------------------------------------

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "PREFETCH_MONTH") {
    const { dates } = event.data;

    if (!Array.isArray(dates)) {
      return;
    }

    event.waitUntil(prefetchMeals(dates));
  }
});

// --------------------------------------------------
// Prefetch all meals of the month
// --------------------------------------------------

async function prefetchMeals(dates) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    dates.map(async (date) => {
      const url = `/api/meals?date=${date}`;

      const request = new Request(url, {
        method: "GET",
      });

      // 이미 캐시되어 있으면 API 요청하지 않는다.
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        return;
      }

      try {
        const response = await fetch(request);

        if (!response.ok) {
          console.warn(
            `Meal API failed: ${date}`,
            response.status
          );
          return;
        }

        await cache.put(request, response.clone());

        console.log(`Meal cached: ${date}`);
      } catch (error) {
        console.error(
          `Meal prefetch failed: ${date}`,
          error
        );
      }
    })
  );
}
