import MealPage from "@/components/MealPage";

function getSeoulToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year =
    parts.find((part) => part.type === "year")?.value ?? "2000";

  const month =
    parts.find((part) => part.type === "month")?.value ?? "01";

  const day =
    parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}${month}${day}`;
}

type HomeProps = {
  searchParams: Promise<{ date?: string }>;
};

function isValidDate(value: string | undefined): value is string {
  if (!value || !/^\d{8}$/.test(value)) return false;
  const date = new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}` === value;
}

export default async function Home({ searchParams }: HomeProps) {
  const { date } = await searchParams;
  const initialDate = isValidDate(date) ? date : getSeoulToday();

  return <MealPage initialDate={initialDate} />;
}
