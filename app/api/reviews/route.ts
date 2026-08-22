import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { getReviewUser } from "@/lib/review-auth";
import { moderateReview, ModerationServiceError } from "@/lib/moderation";
import { consumeReviewAttempt, ReviewRateLimitError } from "@/lib/review-rate-limit";
import { containsBlockedTerm } from "@/lib/review-content-filter";

const REVIEWS_COLLECTION = "reviews";
const validDate = (date: string) => /^\d{8}$/.test(date);

export async function GET(request: NextRequest) {
  try {
    const mealId = request.nextUrl.searchParams.get("mealId");
    if (!mealId || mealId.length > 300) return NextResponse.json({ error: "올바른 식단 정보가 필요합니다." }, { status: 400 });

    const viewer = await getReviewUser(request);
    const snapshot = await db.collection(REVIEWS_COLLECTION).where("mealId", "==", mealId).get();
    const reviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      const canManage = Boolean(viewer && (viewer.isAdmin || data.authorUid === viewer.uid));
      return {
        id: doc.id,
        date: data.date,
        mealId: data.mealId,
        menuName: data.menuName,
        rating: data.rating,
        content: data.content,
        author: data.author,
        ...(viewer?.isAdmin ? { authorEmail: data.authorEmail ?? null } : {}),
        canManage,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? null,
      };
    }).sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("[REVIEWS GET ERROR]", error);
    return NextResponse.json({ error: "리뷰를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getReviewUser(request);
    if (!user) return NextResponse.json({ error: "리뷰 작성은 Google 로그인 후 이용할 수 있습니다." }, { status: 401 });

    const { date, mealId, menuName, nickname, rating, content } = await request.json();
    if (typeof date !== "string" || !validDate(date)) return NextResponse.json({ error: "올바른 날짜가 필요합니다." }, { status: 400 });
    if (typeof mealId !== "string" || mealId.length < 1 || mealId.length > 300 || typeof menuName !== "string" || menuName.trim().length < 1 || menuName.trim().length > 200) return NextResponse.json({ error: "메뉴 정보가 올바르지 않습니다." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "별점은 1점부터 5점까지 선택해 주세요." }, { status: 400 });
    if (typeof content !== "string" || content.trim().length < 1 || content.trim().length > 300) return NextResponse.json({ error: "리뷰는 1~300자까지 작성할 수 있습니다." }, { status: 400 });
    if (nickname !== undefined && (typeof nickname !== "string" || nickname.trim().length > 30)) return NextResponse.json({ error: "닉네임은 30자 이하로 입력해 주세요." }, { status: 400 });

    const existingReviews = await db.collection(REVIEWS_COLLECTION).where("mealId", "==", mealId).get();
    if (existingReviews.docs.some((review) => review.data().authorUid === user.uid)) return NextResponse.json({ error: "이 식단에는 이미 리뷰를 작성했습니다." }, { status: 409 });

    const normalizedContent = content.trim();
    await consumeReviewAttempt(user.uid);
    if (containsBlockedTerm(normalizedContent) || (typeof nickname === "string" && containsBlockedTerm(nickname))) {
      return NextResponse.json({ error: "사용할 수 없는 표현이 포함되어 있습니다. 내용을 수정해 주세요." }, { status: 422 });
    }
    const moderation = await moderateReview(normalizedContent);
    if (moderation.decision !== "allow") {
      return NextResponse.json({ error: "부적절하거나 확인이 필요한 표현이 감지되었습니다. 내용을 수정해 주세요." }, { status: 422 });
    }

    const docRef = db.collection(REVIEWS_COLLECTION).doc(`${mealId}_${user.uid}`);
    await docRef.create({
      date,
      mealId,
      menuName: menuName.trim(),
      rating,
      content: normalizedContent,
      author: typeof nickname === "string" && nickname.trim() ? nickname.trim() : user.name,
      authorEmail: user.email,
      authorUid: user.uid,
      moderation: {
        model: moderation.model,
        label: moderation.label,
        score: moderation.score,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    if (error instanceof ReviewRateLimitError) {
      return NextResponse.json(
        { error: "리뷰 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof ModerationServiceError) {
      console.error("[REVIEW MODERATION ERROR]", error);
      return NextResponse.json({ error: "리뷰 검사 서버를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    console.error("[REVIEWS POST ERROR]", error);
    return NextResponse.json({ error: "리뷰 작성에 실패했습니다." }, { status: 500 });
  }
}
