import MealPage from "@/components/MealPage";

export const dynamic = "force-dynamic";

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

export default function Home() {
  return <MealPage initialDate={getSeoulToday()} />;
}
