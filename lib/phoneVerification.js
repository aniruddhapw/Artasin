import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { verificationOutcome } from "@/lib/phoneVerificationOutcome";

/** How long a code works for after it's made. */
export const CODE_TTL_MS = 30 * 60 * 1000;

function newCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * The code for this user to send, reusing one still running for the same
 * number so reloading the page doesn't hand out a new code each time.
 */
export async function startVerification(user, now = new Date()) {
  const active = await prisma.phoneVerification.findFirst({
    where: { userId: user.id, phone: user.phone, usedAt: null, expiresAt: { gt: new Date(now.getTime() + 5 * 60 * 1000) } },
    orderBy: { createdAt: "desc" }
  });
  if (active) {
    return active;
  }

  // Codes only have to be unique among the ones currently running, which
  // are few; a clash is unlikely, but cheap to rule out.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = newCode();
    const clash = await prisma.phoneVerification.findFirst({
      where: { code, usedAt: null, expiresAt: { gt: now } },
      select: { id: true }
    });
    if (!clash) {
      return prisma.phoneVerification.create({
        data: { userId: user.id, phone: user.phone, code, expiresAt: new Date(now.getTime() + CODE_TTL_MS) }
      });
    }
  }
  throw new Error("Could not create a verification code");
}

/**
 * Handles a code that arrived on WhatsApp from `from` (E.164). Returns the
 * outcome and the account's first name, for the reply.
 */
export async function confirmFromWhatsApp(code, from, now = new Date()) {
  const verification = await prisma.phoneVerification.findFirst({
    where: { code },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, firstName: true, phone: true, phoneVerifiedAt: true } } }
  });
  const user = verification?.user || null;
  const outcome = verificationOutcome(verification, user, from, now);

  if (outcome === "verified") {
    await prisma.$transaction([
      prisma.phoneVerification.update({ where: { id: verification.id }, data: { usedAt: now } }),
      prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: now } })
    ]);
  }
  return { outcome, firstName: user?.firstName || "" };
}
