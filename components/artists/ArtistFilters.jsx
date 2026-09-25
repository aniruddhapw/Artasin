"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Filters the directory by pushing to the URL rather than holding state, so a
 * filtered view can be linked and the page stays server-rendered.
 *
 * The medium and location options are built from the values artists have
 * actually entered, not a fixed list — most profiles have neither field
 * filled in, and offering a category nobody is in is a dead end.
 */
export function ArtistFilters({ locations, mediums, params }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function apply(key, value) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    const query = next.toString();
    router.push(query ? `/artists?${query}` : "/artists");
  }

  return (
    <form
      className="artist-filter-row"
      onSubmit={(event) => {
        event.preventDefault();
        apply("q", new FormData(event.currentTarget).get("q").toString().trim());
      }}
      role="search"
    >
      <label className="artist-search">
        <span className="visually-hidden">Search artists</span>
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
        <input
          defaultValue={params.q || ""}
          name="q"
          placeholder="Search artists, medium or location..."
          type="search"
        />
      </label>

      <label>
        <span className="visually-hidden">Medium</span>
        <select defaultValue={params.medium || ""} onChange={(event) => apply("medium", event.target.value)}>
          <option value="">All mediums</option>
          {mediums.map((medium) => (
            <option key={medium} value={medium}>
              {medium}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="visually-hidden">Location</span>
        <select defaultValue={params.location || ""} onChange={(event) => apply("location", event.target.value)}>
          <option value="">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>

      {/* Every verified artist takes commissions, so this sorts by what they
          have to show rather than pretending some are unavailable. */}
      <label>
        <span className="visually-hidden">Availability</span>
        <select defaultValue={params.showing || ""} onChange={(event) => apply("showing", event.target.value)}>
          <option value="">Anyone</option>
          <option value="for-sale">Has work for sale</option>
          <option value="commissions">Commissions only</option>
        </select>
      </label>

      <label>
        <span className="visually-hidden">Sort by</span>
        <select defaultValue={params.sort || ""} onChange={(event) => apply("sort", event.target.value)}>
          <option value="">Latest work</option>
          <option value="name">Name A–Z</option>
          <option value="works">Most work</option>
          <option value="newest">Recently joined</option>
        </select>
      </label>

      <noscript>
        <button className="button button-secondary" type="submit">
          Search
        </button>
      </noscript>
    </form>
  );
}
