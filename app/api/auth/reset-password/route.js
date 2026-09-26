import crypto from "node:crypto";
import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { RESET_LINK_MESSAGES, resetLinkProblem } from "@/lib/passwordReset";

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

    const problem = resetLinkProblem(resetToken);
    if (problem) {
      return fail(RESET_LINK_MESSAGES[problem], 400, { reason: problem });
    }

    const passwordHash = await hashPassword(input.password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      // This link and every other one still sitting in their inbox.
      prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
    ]);

    return ok({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}
