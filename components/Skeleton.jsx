/**
 * Shared loading placeholders. These render as Suspense fallbacks from each
 * route's loading.js, so a navigation shows the shape of the page immediately
 * instead of leaving the previous screen frozen.
 */

export function SkeletonLine({ width = "100%", height = 14 }) {
  return <span aria-hidden="true" className="skeleton skeleton-line" style={{ width, height }} />;
}

export function SkeletonBlock({ height = 200, radius = 0 }) {
  return <span aria-hidden="true" className="skeleton skeleton-block" style={{ height, borderRadius: radius }} />;
}

export function SkeletonHeader({ lines = 2 }) {
  return (
    <header className="request-header skeleton-header">
      <SkeletonLine height={12} width="80px" />
      <SkeletonLine height={52} width="420px" />
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLine key={index} width={index === lines - 1 ? "40%" : "68%"} />
      ))}
    </header>
  );
}

export function SkeletonCardGrid({ count = 6, className = "gallery-grid" }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index}>
          <SkeletonBlock height={320} />
          <SkeletonLine width="70%" />
          <SkeletonLine width="40%" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4 }) {
  return (
    <div className="order-history-list">
      {Array.from({ length: count }).map((_, index) => (
        <div className="order-history-row" key={index}>
          <SkeletonBlock height={72} />
          <div className="order-history-details skeleton-stack">
            <SkeletonLine width="45%" />
            <SkeletonLine width="28%" />
          </div>
          <SkeletonLine height={28} width="90px" />
        </div>
      ))}
    </div>
  );
}

/** Screen-reader announcement so a loading state is not silent. */
export function LoadingAnnouncement({ label = "Loading" }) {
  return (
    <p className="visually-hidden" role="status">
      {label}
    </p>
  );
}
