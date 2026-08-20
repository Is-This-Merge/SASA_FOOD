function getSeoulToday(): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  const parts = formatter.formatToParts(new Date());

  const year = Number(
    parts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    parts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    parts.find((part) => part.type === "day")?.value
  );

  return new Date(year, month - 1, day);
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
  if (typeof window === "undefined") {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  const dates = getTwoWeekRange(getSeoulToday());

  const sendMessage = () => {
    const controller =
      navigator.serviceWorker.controller;

    if (!controller) {
      return;
    }

    controller.postMessage({
      type: "PREFETCH_DATE_RANGE",
      dates,
    });
  };

  if (navigator.serviceWorker.controller) {
    sendMessage();
    return;
  }

  navigator.serviceWorker.ready.then(() => {
    sendMessage();
  });
}
