import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMealsForMonth,
} from "@/lib/neis";

export async function GET(
  request: NextRequest
) {
  try {
    const date =
      request.nextUrl.searchParams.get(
        "date"
      );

    if (
      !date ||
      !/^\d{8}$/.test(date)
    ) {
      return NextResponse.json(
        {
          error:
            "YYYYMMDD 형식의 날짜가 필요합니다.",
        },
        {
          status: 400,
        }
      );
    }

    const year =
      Number(
        date.slice(0, 4)
      );

    const month =
      Number(
        date.slice(4, 6)
      );

    if (
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        {
          error:
            "올바른 월이 아닙니다.",
        },
        {
          status: 400,
        }
      );
    }

    const meals =
      await getMealsForMonth(
        year,
        month
      );

    console.log(
      "[MONTH API]",
      meals.length,
      meals[0]?.date,
      meals[meals.length - 1]
        ?.date
    );

    return NextResponse.json(
      {
        month:
          `${year}${String(
            month
          ).padStart(
            2,
            "0"
          )}`,
        meals,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[MEALS MONTH ERROR]",
      error
    );

    return NextResponse.json(
      {
        error:
          "월간 급식 정보를 불러오지 못했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}