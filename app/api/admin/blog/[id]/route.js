import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { notifyBlogPostDecision, notifyBlogPostPublished } from "@/lib/blogNotifications";
import { statusTimestamps } from "@/lib/blogReview";
import { prisma } from "@/lib/db";

const decisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(1000).optional()
});

/**
 * Approve a post onto the Journal, or reject it. Rejecting a live post takes
 * it down. Either way the artist is emailed, with the note if there is one.
 */
export async function PATCH(request, context) {
  try {
    const user = await getAuthUser(request);
    if (user?.role !== "ADMIN") {
      return fail("Admin access required", 403);
    }

    const { id } = await context.params;
    const input = decisionSchema.parse(await request.json());
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return fail("Post not found", 404);
    }
    // A draft is still being written; there is nothing to decide yet.
    if (post.status === "DRAFT") {
      return fail("This post has not been submitted", 409);
    }

    const approved = input.decision === "approve";
    const status = approved ? "PUBLISHED" : "REJECTED";
    const updated = await prisma.blogPost.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewNote: approved ? null : input.note || null,
        ...statusTimestamps({ current: post.status, next: status, publishedAt: post.publishedAt })
      }
    });

    // Subscribers hear about a post once, the first time it goes live.
    if (approved && !post.publishedAt) {
      await notifyBlogPostPublished(updated);
    }
    if (post.status !== status) {
      await notifyBlogPostDecision(updated, approved, updated.reviewNote);
    }

    return ok({ post: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
