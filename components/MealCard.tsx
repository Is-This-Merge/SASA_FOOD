import Link from "next/link";

type Meal = { date: string; mealType: string; menu: string[]; calorie?: string; nutrition?: string[] };
const reviewLabel = "식단 리뷰 ›";
const nutritionLabel = "영양 정보";

export default function MealCard({ meal, online }: { meal: Meal; online: boolean }) {
  return <article className="meal-card">
    <div className="meal-header">
      <h2>
        {meal.mealType}
        {online && <Link className="meal-review-link" href={`/reviews/${meal.date}/${encodeURIComponent(meal.mealType)}`}>{reviewLabel}</Link>}
      </h2>
      {meal.calorie && <span>{meal.calorie}</span>}
    </div>
    <ul className="menu-list">{meal.menu.map((menu, index) => <li key={`${menu}-${index}`}>{menu}</li>)}</ul>
    {meal.nutrition && meal.nutrition.length > 0 && <details className="nutrition"><summary>{nutritionLabel}</summary><ul>{meal.nutrition.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
  </article>;
}
