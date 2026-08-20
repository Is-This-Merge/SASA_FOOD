import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { getReviewUser } from "@/lib/review-auth";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedReview(request: NextRequest, id: string) {
  const user = await getReviewUser(request);
  if (!user) return { error: NextResponse.json({ error: "Google 로그인이 필요합니다." }, { status: 401 }) };
  const ref = db.collection("reviews").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { error: NextResponse.json({ error: "리뷰를 찾을 수 없습니다." }, { status: 404 }) };
  if (!user.isAdmin && snapshot.data()?.authorUid !== user.uid) return { error: NextResponse.json({ error: "본인이 작성한 리뷰만 관리할 수 있습니다." }, { status: 403 }) };
  return { ref };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authorized = await getAuthorizedReview(request, id);
    if ("error" in authorized) return authorized.error;
    const { content, rating } = await request.json();
    if (typeof content !== "string" || content.trim().length < 1 || content.trim().length > 100) return NextResponse.json({ error: "리뷰는 1~100자까지 작성할 수 있습니다." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "별점은 1점부터 5점까지 선택해 주세요." }, { status: 400 });
    await authorized.ref.update({ content: content.trim(), rating, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REVIEWS PATCH ERROR]", error);
    return NextResponse.json({ error: "리뷰 수정에 실패했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authorized = await getAuthorizedReview(request, id);
    if ("error" in authorized) return authorized.error;
    await authorized.ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REVIEWS DELETE ERROR]", error);
    return NextResponse.json({ error: "리뷰 삭제에 실패했습니다." }, { status: 500 });
  }
}
