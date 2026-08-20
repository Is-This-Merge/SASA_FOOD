"use client";

import ReviewItem from "./ReviewItem";

export type Review = {
  id: string;
  date: string;
  mealId: string;
  menuName: string;
  rating: number;
  content: string;
  author: string;
  authorEmail?: string | null;
  canManage: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function ReviewList({ reviews, onChanged }: { reviews: Review[]; onChanged: () => void }) {
  if (!reviews.length) return <div className="no-reviews">아직 작성된 리뷰가 없습니다. 첫 리뷰를 남겨 보세요!</div>;
  return <div className="review-list">{reviews.map((review) => <ReviewItem key={review.id} review={review} onChanged={onChanged} />)}</div>;
}
