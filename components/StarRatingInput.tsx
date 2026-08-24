"use client";

import { useState } from "react";

export default function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [preview, setPreview] = useState<number | null>(null);
  const visibleRating = preview ?? value;

  return (
    <div className="rating-input">
      <span>별점</span>
      <div className="rating-stars" role="group" aria-label={`별점 ${value}점`} onMouseLeave={() => setPreview(null)}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={rating <= visibleRating ? "is-selected" : ""}
            aria-label={`${rating}점`}
            aria-pressed={rating === value}
            onMouseEnter={() => setPreview(rating)}
            onFocus={() => setPreview(rating)}
            onBlur={() => setPreview(null)}
            onClick={() => onChange(rating)}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
      </div>
    </div>
  );
}
