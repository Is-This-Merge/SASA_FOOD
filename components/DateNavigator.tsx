"use client";

type DateNavigatorProps = {
  value: string;
  onChange: (date: string) => void;
  onToday?: () => void;
};

function parseDate(value: string): Date {
  return new Date(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)));
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function getSeoulToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}${month}${day}` : formatDate(new Date());
}

export default function DateNavigator({ value, onChange, onToday }: DateNavigatorProps) {
  const date = parseDate(value);
  const displayDate = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(date);
  const inputValue = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const moveDate = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onChange(formatDate(next));
  };

  return <section className="date-box">
    <button type="button" className="date-arrow" aria-label="이전 날짜" onClick={() => moveDate(-1)}>‹</button>
    <div className="date-center">
      <strong>{displayDate}</strong>
      <div className="date-actions">
        <div className="date-picker-wrapper">
          <span className="date-picker-display" aria-hidden="true">{inputValue}</span>
          <input className="date-picker-native" type="date" value={inputValue} aria-label="날짜 선택" onChange={(event) => { const nextDate = event.target.value.replaceAll("-", ""); if (nextDate) onChange(nextDate); }} />
        </div>
        <button type="button" className="today-button" onClick={() => onToday ? onToday() : onChange(getSeoulToday())}>now</button>
      </div>
    </div>
    <button type="button" className="date-arrow" aria-label="다음 날짜" onClick={() => moveDate(1)}>›</button>
  </section>;
}
