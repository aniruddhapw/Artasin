import type { ArtistProfile, User, UserRole, VerificationStatus } from "@prisma/client";

/**
 * Shapes that cross the HTTP boundary between the API routes and the browser.
 * Database rows are typed by Prisma; these are the deliberately smaller views
 * the API chooses to send.
 */

/** Every failed API response. `details` depends on the failure. */
export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

/** `details` of a 422: what `ZodError#flatten()` produces. */
export interface ValidationErrorDetails {
  formErrors: string[];
  fieldErrors: Record<string, string[] | undefined>;
}

/** The signed-in user as the browser sees it: no password hash, no tokens. */
export interface PublicUser {
  id: User["id"];
  email: User["email"];
  firstName: User["firstName"];
  lastName: User["lastName"];
  phone: User["phone"];
  role: UserRole;
  artistProfile: {
    id: ArtistProfile["id"];
    displayName: ArtistProfile["displayName"];
    slug: ArtistProfile["slug"];
    verificationStatus: VerificationStatus;
  } | null;
}

export interface Money {
  cents: number;
  currency: string;
  formatted: string;
}
