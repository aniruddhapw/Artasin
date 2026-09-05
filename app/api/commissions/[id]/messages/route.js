import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const messageSchema = z.object({
  body: z.string().min(1).max(4000)
});

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const commissionRequest = await prisma.commissionRequest.findUnique({ where: { id } });
    if (!commissionRequest) {
      return fail("Commission request not found", 404);
    }

    const isBuyer = commissionRequest.buyerId === user.id;
    const isArtist = user.artistProfile && commissionRequest.artistId === user.artistProfile.id;
    if (!isBuyer && !isArtist) {
      return fail("You cannot message on this request", 403);
    }

    const input = messageSchema.parse(await request.json());
    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        commissionRequestId: id,
        body: input.body
      },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } }
    });

    return created({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
