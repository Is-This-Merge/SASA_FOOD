"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Review } from "./ReviewList";
import StarRatingInput from "./StarRatingInput";

export default function ReviewItem({ review, onChanged }: { review: Review; onChanged: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(review.content);
  const [rating, setRating] = useState(review.rating);
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formatCreatedAt = () => review.createdAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(review.createdAt)) : "";

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!editing || !textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }, [content, editing]);

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
      {review.canManage && <div className="review-actions">
        <button type="button" onClick={() => setEditing((value) => !value)} aria-label={editing ? "수정 취소" : "리뷰 수정"} title={editing ? "수정 취소" : "수정"}>
          {editing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4" /></svg>}
        </button>
        <button type="button" onClick={() => void deleteReview()} disabled={loading} aria-label="리뷰 삭제" title="삭제">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
        </button>
      </div>}
    </div>
    {editing ? <div className="review-edit"><textarea ref={textareaRef} value={content} onChange={(event) => setContent(event.target.value)} rows={1} maxLength={300} /><StarRatingInput value={rating} onChange={setRating} /><button type="button" onClick={() => void request("PATCH")} disabled={loading}>{loading ? "수정 중..." : "수정 완료"}</button></div> : <p className="review-content">{review.content}</p>}
  </article>;
}
