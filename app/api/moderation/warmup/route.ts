import { NextRequest, NextResponse } from "next/server";
import { getReviewUser } from "@/lib/review-auth";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await getReviewUser(request);
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const apiUrl = process.env.MODERATION_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return NextResponse.json({ error: "검사 서버가 설정되지 않았습니다." }, { status: 503 });

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) return NextResponse.json({ error: "검사 서버를 준비하지 못했습니다." }, { status: 503 });
    return NextResponse.json({ ready: true });
  } catch (error) {
    console.warn("[MODERATION WARMUP]", error);
    return NextResponse.json({ error: "검사 서버를 준비하지 못했습니다." }, { status: 503 });
  }
}
