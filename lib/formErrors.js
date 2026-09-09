/**
 * Turns an API error response into something a person can act on.
 *
 * Routes return Zod's `flatten()` output in `details`, but forms were only
 * reading `payload.error` — which is always the generic "Validation failed".
 * That left artists staring at a message that named neither the field nor the
 * problem, on fields that may be scrolled off-screen.
 */

const FIELD_LABELS = {
  title: "Title",
  slug: "URL slug",
  description: "Description",
  category: "Category",
  medium: "Medium",
  dimensions: "Dimensions",
  year: "Year",
  price: "Price",
  currency: "Currency",
  shipsFrom: "Ships from",
  authenticity: "Authenticity",
  edition: "Edition",
  status: "Status",
  media: "Image",
  email: "Email address",
  password: "Password",
  firstName: "First name",
  lastName: "Last name",
  displayName: "Display name",
  artist: "Artist profile",
  requirements: "Requirements",
  artworkType: "Artwork type",
  rating: "Rating",
  quotedPriceCents: "Quote price"
};

function labelFor(field) {
  return FIELD_LABELS[field] || field;
}

export function formatApiError(payload, fallback = "Something went wrong") {
  if (!payload) {
    return fallback;
  }

  const fieldErrors = payload.details?.fieldErrors;
  if (fieldErrors) {
    const messages = Object.entries(fieldErrors)
      .filter(([, errors]) => errors?.length)
      .map(([field, errors]) => `${labelFor(field)}: ${errors[0]}`);
    if (messages.length) {
      return messages.join(". ");
    }
  }

  const formErrors = payload.details?.formErrors;
  if (formErrors?.length) {
    return formErrors.join(". ");
  }

  return payload.error || fallback;
}
