import crypto from "node:crypto";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emails";

const forgotSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase())
});

const TOKEN_TTL_MINUTES = 60;

export async function POST(request) {
  try {
    const input = forgotSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Only send a reset for accounts that can actually use one. Google-only
    // accounts have no password to reset, so they get nothing.
    if (user?.passwordHash) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      await prisma.$transaction([
        // Any older, still-valid link for this user stops working.
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() }
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000)
          }
        })
      ]);

      await sendEmail({ to: user.email, ...passwordResetEmail(token, TOKEN_TTL_MINUTES) });
    }

    // Always the same response, so this can't be used to discover which
    // email addresses have accounts.
    return ok({ message: "If that email has an account, a reset link is on its way." });
  } catch (error) {
    return handleApiError(error);
  }
}
