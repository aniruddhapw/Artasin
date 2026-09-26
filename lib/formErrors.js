/**
 * Turns an API error response into something a person can act on.
 *
 * Routes return Zod's `flatten()` output in `details`, but forms were only
 * reading `payload.error` — which is always the generic "Validation failed".
 * That left artists staring at a message that named neither the field nor the
 * problem, on fields that may be scrolled off-screen.
 *
 * Validation runs on the server and its messages are written in English, so
 * they arrive here as English prose. Rather than restructure every route to
 * emit codes, the known messages are mapped to dictionary keys on the way out.
 * Anything unrecognised falls through as-is: English is a worse experience than
 * Marathi for these artists, but it is still readable, whereas a raw key is not.
 */

const FIELD_KEYS = {
  title: "field.title",
  slug: "field.slug",
  description: "field.description",
  category: "field.category",
  medium: "field.medium",
  dimensions: "field.dimensions",
  year: "field.year",
  price: "field.price",
  shipsFrom: "field.shipsFrom",
  authenticity: "field.authenticity",
  edition: "field.edition",
  status: "field.status",
  media: "field.media",
  imageUrl: "field.imageUrl",
  email: "field.email",
  password: "field.password",
  firstName: "field.firstName",
  lastName: "field.lastName",
  phone: "field.phone",
  displayName: "field.displayName",
  requirements: "field.requirements",
  artworkType: "field.artworkType",
  rating: "field.rating"
};

const MESSAGE_KEYS = {
  "is required": "error.required",
  Required: "error.required",
  "must be at least 3 characters": "error.min3",
  "must be at least 8 characters": "error.min8",
  "must be a valid phone number": "error.invalidPhone",
  "must be greater than zero": "error.greaterThanZero",
  "must be a real year": "error.realYear",
  "cannot be in the future": "error.futureYear",
  "can only use lowercase letters, numbers, and hyphens": "error.slugChars",
  "Must be an absolute URL or a site-relative path": "error.absoluteUrl",
  "is already taken": "error.alreadyTaken",
  "Invalid email": "error.invalidEmail",
  "Validation failed": "error.validationFailed",
  "Internal server error": "error.serverError",
  "Authentication required": "error.authRequired",
  "You can attach up to 5 images": "error.maxImages",
  "Add at least one photo": "error.noImages",
  "Unsupported file type": "error.unsupportedFile",
  "File exceeds the 8MB limit": "error.fileTooLarge",
  "Upload failed": "error.uploadFailed"
};

const identity = (value) => value;

function translateField(field, t) {
  const key = FIELD_KEYS[field];
  return key ? t(key) : field;
}

function translateMessage(message, t) {
  const key = MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

/**
 * @param payload   the parsed JSON error body
 * @param fallback  already-translated text to show when nothing better exists
 * @param t         translator from useT(); omit for English
 */
export function formatApiError(payload, fallback = "Something went wrong", t = identity) {
  if (!payload) {
    return fallback;
  }

  const fieldErrors = payload.details?.fieldErrors;
  if (fieldErrors) {
    const messages = Object.entries(fieldErrors)
      .filter(([, errors]) => errors?.length)
      .map(([field, errors]) => `${translateField(field, t)}: ${translateMessage(errors[0], t)}`);
    if (messages.length) {
      return messages.join(". ");
    }
  }

  const formErrors = payload.details?.formErrors;
  if (formErrors?.length) {
    return formErrors.map((message) => translateMessage(message, t)).join(". ");
  }

  return payload.error ? translateMessage(payload.error, t) : fallback;
}
