import { db } from "@/lib/firebase-admin";

const COLLECTION = "reviewRateLimits";
const SHORT_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const SHORT_WINDOW_LIMIT = 5;
const DAILY_LIMIT = 20;

type RateLimitData = {
  shortWindowStartedAt?: number;
  shortWindowCount?: number;
  dailyWindowStartedAt?: number;
  dailyCount?: number;
};

export class ReviewRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("리뷰 요청 한도를 초과했습니다.");
    this.name = "ReviewRateLimitError";
  }
}

function getWindow(data: RateLimitData, startKey: "shortWindowStartedAt" | "dailyWindowStartedAt", countKey: "shortWindowCount" | "dailyCount", duration: number, now: number) {
  const startedAt = typeof data[startKey] === "number" ? data[startKey] : now;
  const expired = now - startedAt >= duration;
  return {
    startedAt: expired ? now : startedAt,
    count: expired ? 0 : (typeof data[countKey] === "number" ? data[countKey] : 0),
  };
}

export async function consumeReviewAttempt(uid: string): Promise<void> {
  const reference = db.collection(COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const now = Date.now();
    const snapshot = await transaction.get(reference);
    const data = (snapshot.data() ?? {}) as RateLimitData;
    const shortWindow = getWindow(data, "shortWindowStartedAt", "shortWindowCount", SHORT_WINDOW_MS, now);
    const dailyWindow = getWindow(data, "dailyWindowStartedAt", "dailyCount", DAILY_WINDOW_MS, now);

    if (shortWindow.count >= SHORT_WINDOW_LIMIT) {
      throw new ReviewRateLimitError(Math.ceil((shortWindow.startedAt + SHORT_WINDOW_MS - now) / 1000));
    }
    if (dailyWindow.count >= DAILY_LIMIT) {
      throw new ReviewRateLimitError(Math.ceil((dailyWindow.startedAt + DAILY_WINDOW_MS - now) / 1000));
    }

    transaction.set(reference, {
      shortWindowStartedAt: shortWindow.startedAt,
      shortWindowCount: shortWindow.count + 1,
      dailyWindowStartedAt: dailyWindow.startedAt,
      dailyCount: dailyWindow.count + 1,
      updatedAt: now,
    });
  });
}
