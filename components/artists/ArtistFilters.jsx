"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n/LocaleProvider";

/**
 * Filters the directory by pushing to the URL rather than holding state, so a
 * filtered view can be linked and the page stays server-rendered.
 *
 * The medium and location options are built from the values artists have
 * actually entered, not a fixed list — most profiles have neither field
 * filled in, and offering a category nobody is in is a dead end. Mediums come
 * as { value, label } so the label can be translated while the URL keeps the
 * value as stored.
 */
export function ArtistFilters({ locations, mediums, params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();

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
        <span className="visually-hidden">{t("artists.filter.search")}</span>
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
        <input
          defaultValue={params.q || ""}
          name="q"
          placeholder={t("artists.filter.searchPlaceholder")}
          type="search"
        />
      </label>

      <label>
        <span className="visually-hidden">{t("artists.filter.medium")}</span>
        <select defaultValue={params.medium || ""} onChange={(event) => apply("medium", event.target.value)}>
          <option value="">{t("artists.filter.allMediums")}</option>
          {mediums.map((medium) => (
            <option key={medium.value} value={medium.value}>
              {medium.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="visually-hidden">{t("artists.filter.location")}</span>
        <select defaultValue={params.location || ""} onChange={(event) => apply("location", event.target.value)}>
          <option value="">{t("artists.filter.allLocations")}</option>
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
        <span className="visually-hidden">{t("artists.filter.availability")}</span>
        <select defaultValue={params.showing || ""} onChange={(event) => apply("showing", event.target.value)}>
          <option value="">{t("artists.filter.anyone")}</option>
          <option value="for-sale">{t("artists.filter.forSale")}</option>
          <option value="commissions">{t("artists.filter.commissionsOnly")}</option>
        </select>
      </label>

      <label>
        <span className="visually-hidden">{t("artists.filter.sortBy")}</span>
        <select defaultValue={params.sort || ""} onChange={(event) => apply("sort", event.target.value)}>
          <option value="">{t("artists.filter.latest")}</option>
          <option value="name">{t("artists.filter.name")}</option>
          <option value="works">{t("artists.filter.mostWork")}</option>
          <option value="newest">{t("artists.filter.newest")}</option>
        </select>
      </label>

      <noscript>
        <button className="button button-secondary" type="submit">
          {t("artists.filter.submit")}
        </button>
      </noscript>
    </form>
  );
}
