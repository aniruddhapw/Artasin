import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const unsubscribeSchema = z.object({
  endpoint: z.string().url()
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = unsubscribeSchema.parse(await request.json());

    // Scoped to the caller so one user can't drop another user's subscription
    // just by knowing (or guessing) its endpoint.
    await prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint, userId: user.id } });

    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
