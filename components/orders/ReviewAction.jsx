"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const reviewableStatuses = ["DELIVERED", "COMPLETED"];

export function ReviewAction({ orderId, status, review }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  if (review) {
    return (
      <div className="review-submitted">
        <p className="tag">Your Review</p>
        <div className="star-rating-input" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((star) => (
            <span className={star <= review.rating ? "star-static filled" : "star-static"} key={star}>
              ★
            </span>
          ))}
        </div>
        {review.body ? <p>{review.body}</p> : null}
      </div>
    );
  }

  if (!reviewableStatuses.includes(status)) {
    return null;
  }

  if (!open) {
    return (
      <button className="button button-secondary" onClick={() => setOpen(true)} type="button">
        Leave a Review
      </button>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      setError("Please select a star rating");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || undefined })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit your review");
      }
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
      setIsSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <label>
        Rating
        <div className="star-rating-input">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              className={star <= (hoverRating || rating) ? "star-static filled" : "star-static"}
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              type="button"
            >
              ★
            </button>
          ))}
        </div>
      </label>
      <label>
        Comment (optional)
        <textarea
          maxLength={2000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="How was your experience with this artist and piece?"
          rows={3}
          value={body}
        />
      </label>
      {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
      <div className="meeting-form-actions">
        <button className="small-outline" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </button>
        <button className="small-outline" onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
