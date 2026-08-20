"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AllergyNotice from "./AllergyNotice";
import { useAuth } from "./AuthProvider";
import DateNavigator from "./DateNavigator";
import GoogleLoginButton from "./GoogleLoginButton";
import MealCard from "./MealCard";
import ConnectionStatus from "./ConnectionStatus";
import ReviewForm from "./ReviewForm";
import ReviewList, { Review } from "./ReviewList";
import ThemeToggle from "./ThemeToggle";

type Meal = { date: string; mealType: string; menu: string[]; calorie?: string; nutrition?: string[] };
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
  const [loading, setLoading] = useState(true);
  const [mealLoading, setMealLoading] = useState(true);
  const mealId = `${date}:${mealType}`;

  const navigate = (nextDate: string, nextMealType: string) => {
    if (nextDate !== date || nextMealType !== mealType) router.push(`/reviews/${nextDate}/${encodeURIComponent(nextMealType)}`);
  };
  const cycleMeal = () => {
    const mealTypes = [copy.breakfast, copy.lunch, copy.dinner];
    const currentIndex = mealTypes.indexOf(mealType);
    const nextMealType = mealTypes[(currentIndex + 1 + mealTypes.length) % mealTypes.length];
    navigate(date, nextMealType);
  };

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
        setMeal(nextMeals.find((item) => item.mealType === mealType) ?? null);
      })
      .catch(() => { if (active) setMeal(null); })
      .finally(() => { if (active) setMealLoading(false); });
    return () => { active = false; };
  }, [date, mealType]);

  const average = reviews.length ? (reviews.reduce((sum, review) => sum + (review.rating ?? 5), 0) / reviews.length).toFixed(1) : null;
  const icon = mealType === copy.breakfast ? "☀️" : mealType === copy.lunch ? "🌤️" : "🌙";

  return <main className="app review-page">
    <Link className="back-link" href={`/?date=${date}`}>‹ {copy.back}</Link>
    <header className="review-page-header">
      <div className="review-header-actions"><ConnectionStatus /><ThemeToggle /><GoogleLoginButton /></div>
      <h1>{mealType} {copy.review}<button className="review-title-icon" type="button" onClick={cycleMeal} aria-label="다음 식단 리뷰로 이동">{icon}</button></h1>
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
