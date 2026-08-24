export type ModerationDecision = "allow" | "review" | "block";

export type ModerationResult = {
  decision: ModerationDecision;
  label: string;
  score: number;
  model: string;
};

export class ModerationServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ModerationServiceError";
  }
}

function getModerationConfig() {
  const apiUrl = process.env.MODERATION_API_URL?.replace(/\/$/, "");
  const secret = process.env.MODERATION_SECRET;
  const timeout = Number(process.env.MODERATION_TIMEOUT_MS ?? "50000");

  if (!apiUrl || !secret) {
    throw new ModerationServiceError("리뷰 검사 서버가 설정되지 않았습니다.");
  }

  return {
    apiUrl,
    secret,
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 50000,
  };
}

function isModerationResult(value: unknown): value is ModerationResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<ModerationResult>;
  return (
    ["allow", "review", "block"].includes(result.decision ?? "") &&
    typeof result.label === "string" &&
    typeof result.score === "number" &&
    Number.isFinite(result.score) &&
    typeof result.model === "string"
  );
}

export async function moderateReview(content: string): Promise<ModerationResult> {
  const { apiUrl, secret, timeout } = getModerationConfig();

  try {
    const response = await fetch(`${apiUrl}/moderate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new ModerationServiceError(`리뷰 검사 서버 오류: ${response.status}`);
    }

    const result: unknown = await response.json();
    if (!isModerationResult(result)) {
      throw new ModerationServiceError("리뷰 검사 서버의 응답이 올바르지 않습니다.");
    }

    return result;
  } catch (error) {
    if (error instanceof ModerationServiceError) throw error;
    throw new ModerationServiceError("리뷰 검사 서버에 연결하지 못했습니다.", { cause: error });
  }
}
