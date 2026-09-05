import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { artistVerificationDecisionEmail } from "@/lib/emails";

const updateSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  verificationStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional()
});

export async function PATCH(request, context) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { id } = await context.params;
    const input = updateSchema.parse(await request.json());
    if (input.commissionRate === undefined && input.verificationStatus === undefined) {
      return fail("Provide commissionRate and/or verificationStatus", 422);
    }

    const artist = await prisma.artistProfile.update({
      where: { id },
      data: {
        commissionRate: input.commissionRate,
        verificationStatus: input.verificationStatus
      },
      include: { user: { select: { email: true } } }
    });

    if (input.verificationStatus && input.verificationStatus !== "PENDING") {
      await sendEmail({ to: artist.user.email, ...artistVerificationDecisionEmail(input.verificationStatus) });
    }

    return ok({ artist });
  } catch (error) {
    return handleApiError(error);
  }
}
