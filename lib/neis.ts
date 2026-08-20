export type Meal = {
  date: string;
  mealType: string;
  menu: string[];
  allergies?: string[];
  calorie?: string;
  nutrition?: string[];
};

type NeisMealRow = {
  MLSV_YMD?: string;
  MMEAL_SC_CODE?: string;
  DDISH_NM?: string;
  CAL_INFO?: string;
  NTR_INFO?: string;
};

type NeisResponse = {
  mealServiceDietInfo?: [
    {
      head?: unknown[];
    },
    {
      row?: NeisMealRow[];
    }
  ];
};

const API_URL =
  "https://open.neis.go.kr/hub/mealServiceDietInfo";

/**
 * 메뉴 정리
 */
function cleanMenu(
  menu: string
): string[] {
  return menu
    .split("<br/>")
    .map((item) =>
      item.trim()
    )
    .filter(Boolean)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * 영양정보 정리
 */
function cleanNutrition(
  nutrition?: string
): string[] {
  if (!nutrition) {
    return [];
  }

  return nutrition
    .split("<br/>")
    .map((item) =>
      item.trim()
    )
    .filter(Boolean);
}

/**
 * 조식 / 중식 / 석식
 */
function getMealType(code?: string): string {
  switch (code) {
    case "1": return "조식";
    case "2": return "중식";
    case "3": return "석식";
    default: return "급식";
  }
}

function getLegacyMealType(
  code?: string
): string {
  switch (code) {
    case "1":
      return "아침";

    case "2":
      return "점심";

    case "3":
      return "저녁";

    default:
      return "급식";
  }
}

/**
 * NEIS row -> Meal
 */
function convertMealRow(
  row: NeisMealRow,
  fallbackDate: string
): Meal {
  return {
    date:
      row.MLSV_YMD ??
      fallbackDate,

    mealType:
      getMealType(
        row.MMEAL_SC_CODE
      ),

    menu: cleanMenu(
      row.DDISH_NM ?? ""
    ),

    calorie:
      row.CAL_INFO ?? "",

    nutrition:
      cleanNutrition(
        row.NTR_INFO
      ),
  };
}

/**
 * 공통 환경변수 확인
 */
function getNeisConfig() {
  const key =
    process.env.NEIS_API_KEY;

  const officeCode =
    process.env.NEIS_OFFICE_CODE;

  const schoolCode =
    process.env.NEIS_SCHOOL_CODE;

  if (
    !key ||
    !officeCode ||
    !schoolCode
  ) {
    throw new Error(
      "NEIS 환경변수가 설정되지 않았습니다."
    );
  }

  return {
    key,
    officeCode,
    schoolCode,
  };
}

/**
 * 특정 날짜 급식
 */
export async function getMeals(
  date: string
): Promise<Meal[]> {
  const {
    key,
    officeCode,
    schoolCode,
  } = getNeisConfig();

  const url =
    new URL(API_URL);

  url.searchParams.set(
    "KEY",
    key
  );

  url.searchParams.set(
    "Type",
    "json"
  );

  url.searchParams.set(
    "pIndex",
    "1"
  );

  url.searchParams.set(
    "pSize",
    "100"
  );

  url.searchParams.set(
    "ATPT_OFCDC_SC_CODE",
    officeCode
  );

  url.searchParams.set(
    "SD_SCHUL_CODE",
    schoolCode
  );

  url.searchParams.set(
    "MLSV_YMD",
    date.replaceAll(
      "-",
      ""
    )
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `NEIS API 요청 실패: ${response.status}`
    );
  }

  const data =
    (await response.json()) as NeisResponse;

  const rows =
    data
      .mealServiceDietInfo?.[1]
      ?.row ?? [];

  return rows.map(
    (row) =>
      convertMealRow(
        row,
        date
      )
  );
}

/**
 * 특정 월 전체 급식
 *
 * year  = 2026
 * month = 8
 *
 * -> 20260801 ~ 20260831
 */
export async function getMealsForMonth(
  year: number,
  month: number
): Promise<Meal[]> {
  const {
    key,
    officeCode,
    schoolCode,
  } = getNeisConfig();

  /**
   * 해당 월의 마지막 날짜
   */
  const lastDay =
    new Date(
      year,
      month,
      0
    ).getDate();

  const monthString =
    String(month).padStart(
      2,
      "0"
    );

  const fromDate =
    `${year}${monthString}01`;

  const toDate =
    `${year}${monthString}${String(
      lastDay
    ).padStart(
      2,
      "0"
    )}`;

  console.log(
    `[NEIS MONTH] ${fromDate} ~ ${toDate}`
  );

  const url =
    new URL(API_URL);

  url.searchParams.set(
    "KEY",
    key
  );

  url.searchParams.set(
    "Type",
    "json"
  );

  url.searchParams.set(
    "pIndex",
    "1"
  );

  url.searchParams.set(
    "pSize",
    "1000"
  );

  url.searchParams.set(
    "ATPT_OFCDC_SC_CODE",
    officeCode
  );

  url.searchParams.set(
    "SD_SCHUL_CODE",
    schoolCode
  );

  url.searchParams.set(
    "MLSV_FROM_YMD",
    fromDate
  );

  url.searchParams.set(
    "MLSV_TO_YMD",
    toDate
  );

  const response =
    await fetch(
      url.toString(),
      {
        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      `NEIS 월간 API 요청 실패: ${response.status}`
    );
  }

  const data =
    (await response.json()) as NeisResponse;

  const rows =
    data
      .mealServiceDietInfo?.[1]
      ?.row ?? [];

  console.log(
    `[NEIS MONTH] rows=${rows.length}`
  );

  return rows.map(
    (row) =>
      convertMealRow(
        row,
        ""
      )
  );
}
