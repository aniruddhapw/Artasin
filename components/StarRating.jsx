const STAR_PATH =
  "M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z";

function Star({ fillPercent }) {
  return (
    <span className="star" style={{ "--fill": `${fillPercent}%` }}>
      <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
        <path className="star-outline" d={STAR_PATH} />
      </svg>
      <svg aria-hidden="true" className="star-fill" height="16" viewBox="0 0 24 24" width="16">
        <path d={STAR_PATH} />
      </svg>
    </span>
  );
}

export function StarRating({ value = 0, count, size = "md" }) {
  const stars = [0, 1, 2, 3, 4].map((index) => {
    const fillPercent = Math.max(0, Math.min(1, value - index)) * 100;
    return <Star fillPercent={fillPercent} key={index} />;
  });

  return (
    <span className={`star-rating star-rating-${size}`}>
      <span className="star-rating-stars">{stars}</span>
      {typeof count === "number" ? (
        <span className="star-rating-count">
          {value.toFixed(1)} ({count} {count === 1 ? "review" : "reviews"})
        </span>
      ) : null}
    </span>
  );
}
