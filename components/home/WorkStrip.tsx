import Link from "next/link";

/**
 * A slow, continuous scroll of listings across the homepage. Pure CSS: the
 * set is rendered twice and the track slides by exactly one set, so the loop
 * has no seam. The copy is hidden from screen readers and the tab order.
 *
 * Hovering or focusing pauses it, and with reduced motion switched on it stops
 * and becomes an ordinary sideways-scrolling row.
 */
/** A tile in the homepage's scrolling strip, as app/page builds it. */
export interface StripWork {
  id: string;
  slug: string;
  title: string;
  artist: string;
  price: string;
  stripImage: string;
  /** Sources sized for phones and for larger screens (lib/images.ts stripSources). */
  stripSources: { phone: string; wide: string };
  alt: string;
}

/**
 * The first tiles are on screen as the page opens; on a phone one of them is
 * the largest thing in view, which is what Largest Contentful Paint measures.
 * They load first; the rest wait behind them.
 */
const EAGER_TILES = 3;

export function WorkStrip({ label, works }: { label: string; works: readonly StripWork[] }) {
  if (!works.length) {
    return null;
  }

  const tile = (work: StripWork, copy: boolean, index: number) => (
    <Link
      aria-hidden={copy || undefined}
      className="home-strip-tile"
      href={`/artwork/${work.slug}`}
      key={`${copy ? "copy-" : ""}${work.id}`}
      tabIndex={copy ? -1 : undefined}
    >
      {/* Not lazy: tiles take their width from their image, so one loading
          late would widen the track and make the moving strip jump. Past the
          first few, low priority keeps them behind what is in view. Phones
          get files sized for their 210px tiles. The copy reuses the same
          URLs, so it costs nothing. */}
      <picture>
        <source media="(max-width: 860px)" srcSet={work.stripSources.phone} />
        <img
          alt={copy ? "" : work.alt}
          decoding="async"
          fetchPriority={!copy && index < EAGER_TILES ? "high" : "low"}
          src={work.stripImage}
          srcSet={work.stripSources.wide}
        />
      </picture>
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
        {works.map((work, index) => tile(work, false, index))}
        {works.map((work, index) => tile(work, true, index))}
      </div>
    </div>
  );
}
