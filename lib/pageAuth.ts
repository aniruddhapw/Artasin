import type { ArtistProfile } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthUser, type AuthUser } from "@/lib/auth";

/** A signed-in user who has an artist profile. */
export type ArtistUser = AuthUser & { artistProfile: ArtistProfile };

/**
 * For server pages that need a signed-in user. proxy.ts already redirects
 * anyone signed out away from these routes; this repeats the check where the
 * page reads the user, so the page never relies on a check it can't see and
 * TypeScript knows the user is there.
 */
export async function requireUser(returnTo: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

/** As requireUser, for the studio: someone without an artist profile goes home, as proxy.ts does. */
export async function requireArtist(returnTo: string): Promise<ArtistUser> {
  const user = await requireUser(returnTo);
  const { artistProfile } = user;
  if (!artistProfile) {
    redirect("/");
  }
  return { ...user, artistProfile };
}
