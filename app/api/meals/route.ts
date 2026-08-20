import { NextRequest, NextResponse } from "next/server";
import { getMeals } from "@/lib/neis";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      {
        error: "date가 필요합니다.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const meals = await getMeals(date);

    // Keep the API response shape consistent with the Cache Storage entries
    // consumed by MealPage and the service worker.
    return NextResponse.json({ meals });
  } catch (error) {
    console.error("Meal API error:", error);

    return NextResponse.json(
      {
        error: "급식 정보를 가져오지 못했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}
