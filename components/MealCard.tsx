import Link from "next/link";

type Meal = { date: string; mealType: string; menu: string[]; calorie?: string; nutrition?: string[] };
const reviewLabel = "식단 리뷰 ›";
const nutritionLabel = "영양 정보";

export default function MealCard({ meal, online }: { meal: Meal; online: boolean }) {
  return <article className="meal-card">
    <div className="meal-header">
      <h2>{online ? <Link href={`/reviews/${meal.date}/${encodeURIComponent(meal.mealType)}`}>{meal.mealType} <small>{reviewLabel}</small></Link> : meal.mealType}</h2>
      {meal.calorie && <span>{meal.calorie}</span>}
    </div>
    <ul className="menu-list">{meal.menu.map((menu, index) => <li key={`${menu}-${index}`}>{menu}</li>)}</ul>
    {meal.nutrition && meal.nutrition.length > 0 && <details className="nutrition"><summary>{nutritionLabel}</summary><ul>{meal.nutrition.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
  </article>;
}
