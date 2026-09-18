import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = subscribeSchema.parse(await request.json());

    // A given browser subscription (endpoint) can only ever belong to one
    // user at a time — upsert re-points it if it was previously registered
    // under a different account on the same device.
    await prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: { userId: user.id, p256dh: input.keys.p256dh, auth: input.keys.auth },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth
      }
    });

    return created({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
