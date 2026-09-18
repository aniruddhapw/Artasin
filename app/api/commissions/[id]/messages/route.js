import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { newCommissionMessageEmail } from "@/lib/emails";
import { sendPushToUser } from "@/lib/push";

const messageSchema = z.object({
  body: z.string().min(1).max(4000)
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export async function POST(request, context) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const { id } = await context.params;
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id },
      include: { buyer: { select: { id: true, email: true } }, artist: { select: { id: true, userId: true } } }
    });
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

    // Notify whichever side didn't just send this — the buyer if an artist
    // wrote it, or the artist if the buyer did.
    const senderName = `${user.firstName} ${user.lastName}`;
    const recipient = isBuyer
      ? commissionRequest.artist
        ? await prisma.user.findUnique({ where: { id: commissionRequest.artist.userId }, select: { id: true, email: true } })
        : null
      : { id: commissionRequest.buyer.id, email: commissionRequest.buyer.email };

    if (recipient) {
      const threadUrl = isBuyer
        ? `${siteUrl}/studio/commissions/${id}`
        : `${siteUrl}/commissions/${id}`;

      await sendEmail({
        to: recipient.email,
        ...newCommissionMessageEmail(commissionRequest, senderName, input.body, threadUrl)
      });
      await sendPushToUser(recipient.id, {
        title: `New message from ${senderName}`,
        body: input.body.length > 120 ? `${input.body.slice(0, 120)}…` : input.body,
        url: threadUrl
      });
    }

    return created({ message });
  } catch (error) {
    return handleApiError(error);
  }
}
