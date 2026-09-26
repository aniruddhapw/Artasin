import Link from "next/link";

/**
 * A slow, continuous scroll of listings across the homepage. Pure CSS: the
 * set is rendered twice and the track slides by exactly one set, so the loop
 * has no seam. The copy is hidden from screen readers and the tab order.
 *
 * Hovering or focusing pauses it, and with reduced motion switched on it stops
 * and becomes an ordinary sideways-scrolling row.
 */
export function WorkStrip({ label, works }) {
  if (!works.length) {
    return null;
  }

  const tile = (work, copy) => (
    <Link
      aria-hidden={copy || undefined}
      className="home-strip-tile"
      href={`/artwork/${work.slug}`}
      key={`${copy ? "copy-" : ""}${work.id}`}
      tabIndex={copy ? -1 : undefined}
    >
      <img alt={copy ? "" : work.alt} decoding="async" loading="lazy" src={work.stripImage} />
      <span className="home-strip-caption">
        <strong>{work.title}</strong>
        <span>
          {work.artist} · {work.price}
        </span>
      </span>
    </Link>
  );

  return (
    <div aria-label={label} className="home-strip" role="region">
      <div className="home-strip-track">
        {works.map((work) => tile(work, false))}
        {works.map((work) => tile(work, true))}
      </div>
    </div>
  );
}
