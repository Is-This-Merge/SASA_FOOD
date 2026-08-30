"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MealCard from "./MealCard";
import AllergyNotice from "./AllergyNotice";
import DateNavigator from "./DateNavigator";
import GoogleLoginButton from "./GoogleLoginButton";
import ConnectionStatus from "./ConnectionStatus";
import ThemeToggle from "./ThemeToggle";
import { useMealDate } from "./MealDateProvider";

type Meal = {
  date: string;
  mealType: string;
  menu: string[];
  allergies?: string[];
  calorie?: string;
  nutrition?: string[];
};

type MealPageProps = { initialDate: string };

const CACHE_NAME = "school-meals-v9";

function parseDate(value: string) {
  return new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
}

function formatDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function getSeoulToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}${value("month")}${value("day")}`;
}

function extractMeals(data: unknown): Meal[] | null {
  if (Array.isArray(data)) return data as Meal[];
  if (typeof data === "object" && data !== null && Array.isArray((data as { meals?: unknown }).meals)) {
    return (data as { meals: Meal[] }).meals;
  }
  return null;
}

export default function MealPage({ initialDate }: MealPageProps) {
  const { mealDate, setMealDate } = useMealDate();
  const [selectedDate, setSelectedDate] = useState(() => parseDate(mealDate ?? initialDate));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealRatings, setMealRatings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const requestId = useRef(0);
  const initialLoad = useRef(true);
  const shouldRestoreToday = useRef(mealDate === null);
  const dateString = useMemo(() => formatDate(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!shouldRestoreToday.current) return;
    shouldRestoreToday.current = false;
    const today = getSeoulToday();
    if (today !== dateString) setSelectedDate(parseDate(today));
  }, [dateString]);

  useEffect(() => { setMealDate(dateString); }, [dateString, setMealDate]);

  const readCache = useCallback(async (date: string) => {
    const response = await caches.open(CACHE_NAME).then((cache) => cache.match(`/api/meals?date=${date}`));
    return response ? extractMeals(await response.clone().json()) : null;
  }, []);

  const writeCache = useCallback(async (date: string, nextMeals: Meal[]) => {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(`/api/meals?date=${date}`, new Response(JSON.stringify({ meals: nextMeals }), {
      headers: { "Content-Type": "application/json" },
    }));
  }, []);

  const loadMeals = useCallback(async (date: string, revalidate = false) => {
    const id = ++requestId.current;
    setLoading(true);
    const online = navigator.onLine;
    setOffline(!online);

    try {
      const cached = await readCache(date);
      if (cached !== null && id === requestId.current) setMeals(cached);
      if (cached === null && id === requestId.current) setMeals([]);
      if (cached !== null && !revalidate) return;
      if (!online) return;

      const response = await fetch(`/api/meals?date=${date}`, {
        cache: "no-store",
        headers: revalidate ? { "X-Meal-Revalidate": "1" } : undefined,
      });
      if (!response.ok) throw new Error(`Meal API error: ${response.status}`);
      const latest = extractMeals(await response.json()) ?? [];
      if (id === requestId.current) {
        setMeals(latest);
        setOffline(false);
      }
      if (!navigator.serviceWorker?.controller) await writeCache(date, latest);
    } catch (error) {
      console.warn("[meal request]", date, error);
      if (id === requestId.current) {
        setOffline(true);
        setMeals((await readCache(date)) ?? []);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [readCache, writeCache]);

  useEffect(() => {
    const revalidate = initialLoad.current;
    initialLoad.current = false;
    void loadMeals(dateString, revalidate);
  }, [dateString, loadMeals]);

  useEffect(() => {
    const onOnline = () => void loadMeals(dateString, true);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [dateString, loadMeals]);

  useEffect(() => {
    let active = true;
    if (offline || meals.length === 0) {
      setMealRatings({});
      return () => { active = false; };
    }

    setMealRatings({});
    void Promise.all(meals.map(async (meal) => {
      const mealId = `${meal.date}:${meal.mealType}`;
      try {
        const response = await fetch(`/api/reviews?mealId=${encodeURIComponent(mealId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Review API error: ${response.status}`);
        const data = await response.json();
        const reviews = Array.isArray(data.reviews) ? data.reviews : [];
        const average = reviews.length
          ? (reviews.reduce((sum: number, review: { rating?: number }) => sum + (review.rating ?? 5), 0) / reviews.length).toFixed(1)
          : null;
        return [mealId, average] as const;
      } catch {
        return [mealId, null] as const;
      }
    })).then((entries) => {
      if (active) setMealRatings(Object.fromEntries(entries));
    });

    return () => { active = false; };
  }, [meals, offline]);

  return (
    <main className="app">
      <header className="header">
        <div className="brand"><h1>SASA FOOD</h1><p>오늘의 급식</p></div>
        <div className="header-actions">
          <ConnectionStatus />
          <ThemeToggle />
          <GoogleLoginButton />
        </div>
      </header>

      <DateNavigator value={dateString} onChange={(value) => setSelectedDate(parseDate(value))} />

      {loading ? (
        <section className="loading">급식 정보를 불러오는 중…</section>
      ) : meals.length > 0 ? (
        <>
          <section className="meal-list">
            {meals.map((meal) => (
              <MealCard
                key={`${meal.date}-${meal.mealType}`}
                meal={meal}
                online={!offline && typeof navigator !== "undefined" && navigator.onLine}
                rating={mealRatings[`${meal.date}:${meal.mealType}`]}
              />
            ))}
          </section>
          <AllergyNotice />
        </>
      ) : (
        <section className="empty">
          <div className="empty-icon" aria-hidden="true">—</div>
          <h2>급식 정보가 없습니다</h2>
          <p>해당 날짜에 등록된 급식 정보가 없습니다.</p>
        </section>
      )}
    </main>
  );
}
