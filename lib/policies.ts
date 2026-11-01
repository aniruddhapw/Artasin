/**
 * What ARTASIN promises buyers of listed artwork, shown on every artwork page
 * and spelled out on the returns page (app/returns) and in the terms
 * (app/terms/page.tsx, "Delivery and returns"). Google Merchant Center's
 * return settings must match too. Change them here so none of them disagree.
 */

/** Orders within India arrive within this many days of being confirmed. */
export const DELIVERY_DAYS = 14;

/** A listed work can be returned within this many days of delivery. */
export const RETURN_DAYS = 7;
