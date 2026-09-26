import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { isBlankBlogHtml, sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyBlogPostPublished, notifyBlogPostSubmitted } from "@/lib/blogNotifications";
import { changesContent, resolveArtistStatus, statusTimestamps } from "@/lib/blogReview";

const MAX_BODY_LENGTH = 50000;

const updatePostSchema = z.object({
  title: z.string().min(1, { message: "is required" }).max(200).optional(),
  excerpt: z.string().max(300).nullable().optional(),
  body: z.string().max(MAX_BODY_LENGTH).optional(),
  coverImageUrl: z.string().nullable().optional(),
  // PUBLISHED is accepted from a form loaded before review existed; it
  // submits the post like PENDING_REVIEW does.
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED"]).optional()
});

async function loadOwnedPost(request, id) {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: fail("Authentication required", 401) };
  }
  if (!user.artistProfile) {
    return { error: fail("Only artists can write blog posts", 403) };
  }
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    return { error: fail("Post not found", 404) };
  }
  if (post.artistId !== user.artistProfile.id) {
    return { error: fail("This post belongs to another artist", 403) };
  }
  return { post, isAdmin: user.role === "ADMIN" };
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const { post, isAdmin, error } = await loadOwnedPost(request, id);
    if (error) {
      return error;
    }

    const input = updatePostSchema.parse(await request.json());

    if (input.body !== undefined) {
      input.body = sanitizeBlogHtml(input.body);
      if (isBlankBlogHtml(input.body)) {
        return fail("Validation failed", 422, { fieldErrors: { body: ["is required"] } });
      }
    }

    const status = resolveArtistStatus({
      current: post.status,
      requested: input.status,
      contentChanged: changesContent(post, input),
      isAdmin
    });

    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        coverImageUrl: input.coverImageUrl,
        status,
        ...statusTimestamps({ current: post.status, next: status, publishedAt: post.publishedAt })
      }
    });

    // Subscribers hear about a post once, the first time it goes live.
    if (status === "PUBLISHED" && !post.publishedAt) {
      await notifyBlogPostPublished(updated);
    } else if (status === "PENDING_REVIEW" && post.status !== "PENDING_REVIEW") {
      await notifyBlogPostSubmitted(updated);
    }

    return ok({ post: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request, context) {
  try {
    const { id } = await context.params;
    const { post, error } = await loadOwnedPost(request, id);
    if (error) {
      return error;
    }

    await prisma.blogPost.delete({ where: { id: post.id } });
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
