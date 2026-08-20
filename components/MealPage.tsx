"use client";

import { TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import MealCard from "./MealCard";
import AllergyNotice from "./AllergyNotice";
import DateNavigator from "./DateNavigator";
import GoogleLoginButton from "./GoogleLoginButton";
import ConnectionStatus from "./ConnectionStatus";
import ThemeToggle from "./ThemeToggle";

type Meal = {
  date: string;
  mealType: string;
  menu: string[];
  allergies?: string[];
  calorie?: string;
  nutrition?: string[];
};

type MealPageProps = { initialDate: string };

const CACHE_NAME = "school-meals-v7";

function parseDate(value: string) {
  return new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
}

function formatDate(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function extractMeals(data: unknown): Meal[] | null {
  if (Array.isArray(data)) return data as Meal[];
  if (typeof data === "object" && data !== null && Array.isArray((data as { meals?: unknown }).meals)) {
    return (data as { meals: Meal[] }).meals;
  }
  return null;
}

export default function MealPage({ initialDate }: MealPageProps) {
  const [selectedDate, setSelectedDate] = useState(() => parseDate(initialDate));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const requestId = useRef(0);
  const dateString = useMemo(() => formatDate(selectedDate), [selectedDate]);

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

  const loadMeals = useCallback(async (date: string) => {
    const id = ++requestId.current;
    setLoading(true);
    const online = navigator.onLine;
    setOffline(!online);

    try {
      const cached = await readCache(date);
      if (cached !== null && id === requestId.current) setMeals(cached);
      if (!online) return;

      const response = await fetch(`/api/meals?date=${date}`, { cache: "no-store" });
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

  useEffect(() => { void loadMeals(dateString); }, [dateString, loadMeals]);

  useEffect(() => {
    const onOnline = () => void loadMeals(dateString);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [dateString, loadMeals]);

  const moveDate = (days: number) => setSelectedDate((current) => {
    const next = new Date(current);
    next.setDate(next.getDate() + days);
    return next;
  });

  const onTouchStart = (event: TouchEvent<HTMLElement>) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; };
  const onTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 50) return;
    moveDate(start > end ? 1 : -1);
  };

  return (
    <main className="app" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="header">
        <div><h1>SASA FOOD</h1></div>
        <div className="header-actions"><ConnectionStatus /><ThemeToggle /><GoogleLoginButton /></div>
      </header>

      <DateNavigator value={dateString} onChange={(value) => setSelectedDate(parseDate(value))} />

      {loading ? <section className="loading">급식 정보를 불러오는 중…</section> : meals.length > 0 ? (
        <><section className="meal-list">{meals.map((meal) => <MealCard key={`${meal.date}-${meal.mealType}`} meal={meal} online={!offline && typeof navigator !== "undefined" && navigator.onLine} />)}</section><AllergyNotice /></>
      ) : <section className="empty"><div className="empty-icon">🍽️</div><h2>급식 정보가 없습니다</h2><p>해당 날짜에 등록된 급식 정보가 없습니다.</p></section>}
    </main>
  );
}
