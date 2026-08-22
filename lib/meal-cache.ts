function getSeoulToday(): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(new Date());

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return new Date(getPart("year"), getPart("month") - 1, getPart("day"));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getTwoWeekRange(date: Date): string[] {
  return Array.from({ length: 29 }, (_, index) => {
    const target = new Date(date);
    target.setDate(target.getDate() + index - 14);
    return formatDate(target);
  });
}

export function prefetchNearbyMeals(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const dates = getTwoWeekRange(getSeoulToday());

  const sendMessage = (worker: ServiceWorker | null) => {
    worker?.postMessage({
      type: "PREFETCH_DATE_RANGE",
      dates,
    });
  };

  if (navigator.serviceWorker.controller) {
    sendMessage(navigator.serviceWorker.controller);
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    sendMessage(registration.active);
  });
}
