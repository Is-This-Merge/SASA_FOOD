"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Review } from "./ReviewList";

export default function ReviewItem({ review, onChanged }: { review: Review; onChanged: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(review.content);
  const [rating, setRating] = useState(review.rating);
  const [loading, setLoading] = useState(false);
  const formatCreatedAt = () => review.createdAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(review.createdAt)) : "";

  async function request(method: "PATCH" | "DELETE") {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/reviews/${review.id}`, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: method === "PATCH" ? JSON.stringify({ content, rating }) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
      setEditing(false);
      onChanged();
    } catch (error) {
      alert(error instanceof Error ? error.message : "요청에 실패했습니다.");
    } finally { setLoading(false); }
  }

  async function deleteReview() {
    if (window.confirm("정말 이 리뷰를 삭제할까요?")) await request("DELETE");
  }

  return <article className="review-item">
    <div className="review-top"><div><strong>{review.author}</strong>{review.authorEmail && <span className="review-email">{review.authorEmail}</span>}<span className="review-stars" aria-label={`${review.rating}점`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><span>{formatCreatedAt()}</span></div>
      {review.canManage && <div className="review-actions"><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "취소" : "수정"}</button><button type="button" onClick={() => void deleteReview()} disabled={loading}>삭제</button></div>}
    </div>
    {editing ? <div className="review-edit"><textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} maxLength={100} /><label className="rating-input">별점 <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}점</option>)}</select></label><button type="button" onClick={() => void request("PATCH")} disabled={loading}>{loading ? "수정 중..." : "수정 완료"}</button></div> : <p className="review-content">{review.content}</p>}
  </article>;
}
