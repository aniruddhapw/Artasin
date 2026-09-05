import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const cookieName = "artisan_session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value");
  }
  return new TextEncoder().encode(secret);
}

export async function proxy(request) {
  const token = request.cookies.get(cookieName)?.value;
  const { pathname } = request.nextUrl;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (pathname.startsWith("/studio") && payload.role !== "ARTIST") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/studio/:path*", "/admin/:path*", "/orders/:path*", "/commissions/:path*", "/checkout/:path*"]
};
