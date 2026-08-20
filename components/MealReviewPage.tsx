"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AllergyNotice from "./AllergyNotice";
import { useAuth } from "./AuthProvider";
import DateNavigator from "./DateNavigator";
import GoogleLoginButton from "./GoogleLoginButton";
import MealCard from "./MealCard";
import ConnectionStatus from "./ConnectionStatus";
import ReviewForm from "./ReviewForm";
import ReviewList, { Review } from "./ReviewList";

type Meal = { date: string; mealType: string; menu: string[]; calorie?: string; nutrition?: string[] };
type TouchGestureEvent = {
  changedTouches: { [index: number]: { clientX: number; clientY: number } };
  touches: { [index: number]: { clientX: number; clientY: number } };
};

const copy = {
  breakfast: "조식",
  lunch: "중식",
  dinner: "석식",
  review: "리뷰",
  back: "급식표로 돌아가기",
  loadingMeal: "식단을 불러오는 중...",
  missingMeal: "등록된 식단 정보가 없습니다.",
  write: "리뷰 남기기",
  reviews: "식단 리뷰",
  loadingReviews: "리뷰를 불러오는 중...",
  noRating: "아직 별점이 없어요",
};

function getSeoulCurrentMeal() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const mealType = hour >= 15 ? copy.dinner : hour >= 10 ? copy.lunch : copy.breakfast;
  return { date: `${value("year")}${value("month")}${value("day")}`, mealType };
}

export default function MealReviewPage({ date, mealType, menuName }: { date: string; mealType: string; menuName: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meal, setMeal] = useState<Meal | null>(null);
  const [dayMeals, setDayMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mealLoading, setMealLoading] = useState(true);
  const [edgeBounce, setEdgeBounce] = useState<"" | "bounce-up" | "bounce-down">("");
  const [dragOffset, setDragOffset] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const mealTransitioning = useRef(false);
  const mealId = `${date}:${mealType}`;

  const navigate = (nextDate: string, nextMealType: string) => {
    if (nextDate !== date || nextMealType !== mealType) router.push(`/reviews/${nextDate}/${encodeURIComponent(nextMealType)}`);
  };
  const moveMeal = (direction: number) => {
    const index = dayMeals.findIndex((item) => item.mealType === mealType);
    const next = dayMeals[index + direction];
    const bounceDirection = direction > 0 ? "up" : "down";
    if (!next) {
      triggerBounce(bounceDirection);
      return;
    }
    if (mealTransitioning.current) return;
    mealTransitioning.current = true;
    triggerBounce(bounceDirection);
    window.setTimeout(() => navigate(date, next.mealType), 300);
  };
  const triggerBounce = (direction: "up" | "down") => {
    setEdgeBounce(direction === "up" ? "bounce-up" : "bounce-down");
    window.setTimeout(() => setEdgeBounce(""), 320);
  };
  const onTouchStart = (event: TouchGestureEvent) => {
    const touch = event.changedTouches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: TouchGestureEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    setDragOffset(0);
    if (!start || !touch) return;
    const verticalDistance = touch.clientY - start.y;
    const horizontalDistance = touch.clientX - start.x;
    if (Math.abs(verticalDistance) < 60 || Math.abs(verticalDistance) <= Math.abs(horizontalDistance)) return;
    const atTop = window.scrollY <= 2;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (verticalDistance < 0 && atBottom) {
      moveMeal(1);
    }
    if (verticalDistance > 0 && atTop) {
      moveMeal(-1);
    }
  };
  const onTouchMove = (event: TouchGestureEvent) => {
    const start = touchStart.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const verticalDistance = touch.clientY - start.y;
    const horizontalDistance = touch.clientX - start.x;
    if (Math.abs(verticalDistance) <= Math.abs(horizontalDistance)) return;
    const atTop = window.scrollY <= 2;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const isPullingPastEdge = (verticalDistance > 0 && atTop) || (verticalDistance < 0 && atBottom);
    setDragOffset(isPullingPastEdge ? Math.max(-24, Math.min(24, verticalDistance * 0.18)) : 0);
  };

  useEffect(() => {
    const handleTouchStart = (event: globalThis.TouchEvent) => onTouchStart(event);
    const handleTouchMove = (event: globalThis.TouchEvent) => onTouchMove(event);
    const handleTouchEnd = (event: globalThis.TouchEvent) => onTouchEnd(event);
    const handleTouchCancel = () => { touchStart.current = null; setDragOffset(0); };
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 12) return;
      const atTop = window.scrollY <= 2;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (event.deltaY < 0 && atTop) {
        event.preventDefault();
        moveMeal(-1);
      }
      if (event.deltaY > 0 && atBottom) {
        event.preventDefault();
        moveMeal(1);
      }
    };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [date, dayMeals, mealType]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const atTop = window.scrollY <= 2;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (event.key === "ArrowUp" && atTop) {
        event.preventDefault();
        moveMeal(-1);
      }
      if (event.key === "ArrowDown" && atBottom) {
        event.preventDefault();
        moveMeal(1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dayMeals, mealType]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch(`/api/reviews?mealId=${encodeURIComponent(mealId)}`, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (error) {
      console.warn("[reviews]", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [mealId, user]);

  useEffect(() => { void loadReviews(); }, [loadReviews]);
  useEffect(() => {
    let active = true;
    setMealLoading(true);
    void fetch(`/api/meals?date=${date}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Meal API error: ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data : Array.isArray(data?.meals) ? data.meals : [];
      })
      .then((nextMeals: Meal[]) => {
        if (!active) return;
        setDayMeals(nextMeals);
        setMeal(nextMeals.find((item) => item.mealType === mealType) ?? null);
      })
      .catch(() => { if (active) { setDayMeals([]); setMeal(null); } })
      .finally(() => { if (active) setMealLoading(false); });
    return () => { active = false; };
  }, [date, mealType]);

  const average = reviews.length ? (reviews.reduce((sum, review) => sum + (review.rating ?? 5), 0) / reviews.length).toFixed(1) : null;
  const icon = mealType === copy.breakfast ? "☀️" : mealType === copy.lunch ? "🌤️" : "🌙";

  return <main className={`app review-page ${edgeBounce}`} style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined }}>
    <Link className="back-link" href={`/?date=${date}`}>‹ {copy.back}</Link>
    <header className="review-page-header">
      <div className="review-header-actions"><ConnectionStatus /><GoogleLoginButton /></div>
      <h1>{mealType} {copy.review}<span className="review-title-icon">{icon}</span></h1>
      <p>{average ? `★ ${average} / 5 · ${copy.reviews} ${reviews.length}개` : copy.noRating}</p>
    </header>
    <DateNavigator value={date} onChange={(nextDate) => navigate(nextDate, mealType)} onToday={() => {
      const current = getSeoulCurrentMeal();
      navigate(current.date, current.mealType);
    }} />
    {mealLoading ? <section className="loading">{copy.loadingMeal}</section> : meal ? <MealCard meal={meal} online={false} /> : <section className="empty"><p>{copy.missingMeal}</p></section>}
    <section className="allergy-panel"><AllergyNotice /></section>
    <section className="review-section"><h2>{copy.write}</h2><ReviewForm date={date} mealId={mealId} menuName={menuName} onCreated={loadReviews} /></section>
    <section className="review-section"><h2>{copy.reviews}</h2>{loading ? <div className="loading">{copy.loadingReviews}</div> : <ReviewList reviews={reviews} onChanged={loadReviews} />}</section>
  </main>;
}
