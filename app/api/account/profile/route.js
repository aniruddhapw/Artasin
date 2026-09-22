import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7, "must be a valid phone number")
    .regex(/^[0-9+\-\s()]{7,20}$/, "must be a valid phone number")
});

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = updateSchema.parse(await request.json());

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { phone: input.phone },
      include: { artistProfile: true }
    });

    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
