import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exchangeGoogleCode, fetchGoogleProfile } from "@/lib/googleAuth";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("g_oauth_state")?.value;
  const redirectTarget = cookieStore.get("g_oauth_redirect")?.value;
  cookieStore.delete("g_oauth_state");
  cookieStore.delete("g_oauth_redirect");

  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(`${siteUrl}/login?error=google_auth_failed`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(`${siteUrl}/login?error=google_email_unverified`);
    }

    const email = profile.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub }, include: { artistProfile: true } });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email }, include: { artistProfile: true } });
      user = existingByEmail
        ? await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { googleId: profile.sub },
            include: { artistProfile: true }
          })
        : await prisma.user.create({
            data: {
              email,
              googleId: profile.sub,
              firstName: profile.given_name || profile.name?.split(" ")[0] || "Collector",
              lastName: profile.family_name || profile.name?.split(" ").slice(1).join(" ") || "",
              role: "BUYER"
            },
            include: { artistProfile: true }
          });
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    const fallback = user.role === "ARTIST" ? "/studio" : "/";
    const destination = redirectTarget && redirectTarget.startsWith("/") ? redirectTarget : fallback;
    return NextResponse.redirect(`${siteUrl}${destination}`);
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    return NextResponse.redirect(`${siteUrl}/login?error=google_auth_failed`);
  }
}
