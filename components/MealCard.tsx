"use client";

import Link from "next/link";
import { useState } from "react";

type Meal = { date: string; mealType: string; menu: string[]; calorie?: string; nutrition?: string[] };
const reviewLabel = "식단 리뷰 ›";
const nutritionLabel = "영양 정보";

const weekdayMealTimes: Record<string, string> = {
  조식: "07:40–08:20",
  중식: "12:10–13:10",
  석식: "17:50–18:50",
};

const weekendMealTimes: Record<string, string> = {
  조식: "08:40–09:30",
  중식: "12:30–13:20",
  석식: "17:30–18:20",
};

function getMealTime(date: string, mealType: string): string | undefined {
  const parsedDate = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );
  const day = parsedDate.getDay();
  return (day === 0 || day === 6 ? weekendMealTimes : weekdayMealTimes)[mealType];
}

export default function MealCard({ meal, online }: { meal: Meal; online: boolean }) {
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const mealTime = getMealTime(meal.date, meal.mealType);
  return <article className="meal-card">
    <div className="meal-header">
      <h2>
        {meal.mealType}
        {online && <Link className="meal-review-link" href={`/reviews/${meal.date}/${encodeURIComponent(meal.mealType)}`}>{reviewLabel}</Link>}
      </h2>
      <div className="meal-meta">
        {mealTime && <time>{mealTime}</time>}
        {meal.calorie && <span>{meal.calorie}</span>}
      </div>
    </div>
    <ul className="menu-list">{meal.menu.map((menu, index) => <li key={`${menu}-${index}`}>{menu}</li>)}</ul>
    {meal.nutrition && meal.nutrition.length > 0 && <section className="nutrition">
      <button className="nutrition-toggle" type="button" aria-expanded={nutritionOpen} onClick={() => setNutritionOpen((open) => !open)}>
        <span aria-hidden="true">{nutritionOpen ? "▾" : "▸"}</span>{nutritionLabel}
      </button>
      <div className={`nutrition-content${nutritionOpen ? " is-open" : ""}`} aria-hidden={!nutritionOpen}><div><ul>{meal.nutrition.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>
    </section>}
  </article>;
}
