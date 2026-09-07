import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const changeSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8)
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = changeSchema.parse(await request.json());

    // Google-only accounts have no password yet, so there's nothing to verify —
    // the active session is proof enough to set one for the first time.
    if (user.passwordHash) {
      if (!input.currentPassword) {
        return fail("Enter your current password", 422);
      }
      if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
        return fail("Your current password is incorrect", 401);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) }
    });

    return ok({ message: "Password updated." });
  } catch (error) {
    return handleApiError(error);
  }
}
