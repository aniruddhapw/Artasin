import { z } from "zod";
import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const meetingSchema = z.object({
  commissionRequestId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  meetingType: z.enum(["Video call", "Phone call", "In-person studio visit"]),
  notes: z.string().optional()
});

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const input = meetingSchema.parse(await request.json());
    const commissionRequest = await prisma.commissionRequest.findUnique({
      where: { id: input.commissionRequestId }
    });

    if (!commissionRequest) {
      return fail("Commission request not found", 404);
    }

    const isBuyer = commissionRequest.buyerId === user.id;
    const isArtist =
      user.artistProfile && commissionRequest.artistId === user.artistProfile.id;
    if (!isBuyer && !isArtist && user.role !== "ADMIN") {
      return fail("You cannot schedule a meeting for this request", 403);
    }

    const meeting = await prisma.meeting.create({
      data: {
        buyerId: commissionRequest.buyerId,
        commissionRequestId: commissionRequest.id,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes,
        meetingType: input.meetingType,
        notes: input.notes,
        provider: process.env.MEETING_PROVIDER || "manual"
      }
    });

    return created({ meeting });
  } catch (error) {
    return handleApiError(error);
  }
}
