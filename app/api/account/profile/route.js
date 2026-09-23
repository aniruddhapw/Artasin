import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { phoneSchema } from "@/lib/phone";

const updateSchema = z.object({
  phone: phoneSchema,
  whatsappOptIn: z.boolean().default(false)
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
      data: { phone: input.phone, whatsappOptIn: input.whatsappOptIn },
      include: { artistProfile: true }
    });

    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
