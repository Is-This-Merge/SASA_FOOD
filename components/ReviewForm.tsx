"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "./AuthProvider";

export default function ReviewForm({ date, mealId, menuName, onCreated }: { date: string; mealId: string; menuName: string; onCreated: () => void }) {
  const { user, loading: authLoading, signInWithGoogle, signOutUser } = useAuth();
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!content.trim()) return alert("리뷰 내용을 입력해 주세요.");
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ date, mealId, menuName, nickname, content, rating }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "리뷰 작성에 실패했습니다.");
      setNickname("");
      setContent("");
      setRating(5);
      onCreated();
    } catch (error) {
      alert(error instanceof Error ? error.message : "리뷰 작성에 실패했습니다.");
    } finally { setLoading(false); }
  }

  if (authLoading) return <div className="review-login">로그인 상태를 확인하는 중...</div>;
  if (!user) return <div className="review-login"><p>리뷰 작성은 Google 로그인 후 이용할 수 있습니다.</p><button type="button" onClick={() => void signInWithGoogle()}>Google로 로그인</button></div>;

  return <form className="review-form" onSubmit={submit}>
    <div className="review-user"><span>{user.displayName ?? user.email}</span><button type="button" onClick={() => void signOutUser()}>로그아웃</button></div>
    <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={user.displayName || "Google 닉네임"} maxLength={30} />
    <label className="rating-input">별점 <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{"★".repeat(value)}{"☆".repeat(5 - value)} ({value}점)</option>)}</select></label>
    <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={`${menuName}은 어땠나요?`} maxLength={300} rows={4} />
    <button type="submit" disabled={loading}>{loading ? "작성 중..." : "리뷰 작성"}</button>
  </form>;
}
