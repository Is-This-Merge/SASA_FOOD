import MealReviewPage from "@/components/MealReviewPage";

const mealPlan = "리뷰";

export default async function Page({ params }: { params: Promise<{ date: string; mealType: string }> }) {
  const { date, mealType } = await params;
  const decodedMealType = decodeURIComponent(mealType);
  return <MealReviewPage key={`${date}-${decodedMealType}`} date={date} mealType={decodedMealType} menuName={decodedMealType} />;
}
