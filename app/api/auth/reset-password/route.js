import crypto from "node:crypto";
import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

export async function POST(request) {
  try {
    const input = resetSchema.parse(await request.json());
    const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return fail("This reset link is invalid or has expired. Request a new one.", 400);
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    return ok({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}
