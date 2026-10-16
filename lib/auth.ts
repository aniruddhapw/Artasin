import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { PublicUser } from "@/types/api";

const cookieName = "artisan_session";

/** The signed-in user, as every page and API route receives it. */
export type AuthUser = Prisma.UserGetPayload<{ include: { artistProfile: true } }>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: Pick<User, "id" | "role" | "email">): Promise<string> {
  return new SignJWT({
    role: user.role,
    email: user.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

/**
 * The user behind a request: a `Bearer` token if one is sent, otherwise the
 * session cookie. Pages call it with no request and get the cookie.
 */
export async function getAuthUser(request?: Request): Promise<AuthUser | null> {
  const authHeader = request?.headers?.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(cookieName)?.value;
  const token = bearerToken || cookieToken;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub) {
      return null;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { artistProfile: true }
    });
    return user;
  } catch {
    return null;
  }
}

export function publicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    artistProfile: user.artistProfile
      ? {
          id: user.artistProfile.id,
          displayName: user.artistProfile.displayName,
          slug: user.artistProfile.slug,
          verificationStatus: user.artistProfile.verificationStatus
        }
      : null
  };
}
