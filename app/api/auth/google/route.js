import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/googleAuth";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export async function GET(request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(`${siteUrl}/login?error=google_not_configured`);
  }

  const { searchParams } = new URL(request.url);
  const redirectTarget = searchParams.get("redirect");

  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  };
  cookieStore.set("g_oauth_state", state, cookieOptions);
  if (redirectTarget && redirectTarget.startsWith("/")) {
    cookieStore.set("g_oauth_redirect", redirectTarget, cookieOptions);
  }

  return NextResponse.redirect(getGoogleAuthUrl(state));
}
