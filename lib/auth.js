import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const cookieName = "artisan_session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("JWT_SECRET must be set to a long random value");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user) {
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

export async function setSessionCookie(token) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getAuthUser(request) {
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
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { artistProfile: true }
    });
    return user;
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
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
