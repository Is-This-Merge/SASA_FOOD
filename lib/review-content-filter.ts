const DEFAULT_BLOCKED_TERMS = [
  "개새끼",
  "개색기",
  "꺼져",
  "닥쳐",
  "뒤져",
  "디져",
  "또라이",
  "병신",
  "븅신",
  "시발",
  "씨발",
  "ㅅㅂ",
  "엿먹어",
  "정신병자",
  "좆",
  "존나",
  "지랄",
  "ㅈㄹ",
  "창녀",
] as const;

function normalizeForFilter(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(.)\1{3,}/gu, "$1$1")
    .replace(/[\p{White_Space}\p{P}\p{S}_]+/gu, "");
}

function getBlockedTerms(): string[] {
  const configuredTerms = (process.env.REVIEW_BLOCKED_TERMS ?? "")
    .split(/[\n,]/)
    .map((term) => normalizeForFilter(term))
    .filter(Boolean);

  return [...new Set([...DEFAULT_BLOCKED_TERMS.map(normalizeForFilter), ...configuredTerms])];
}

const BLOCKED_TERMS = getBlockedTerms();

export function containsBlockedTerm(value: string): boolean {
  const normalized = normalizeForFilter(value);
  return normalized.length > 0 && BLOCKED_TERMS.some((term) => normalized.includes(term));
}
