import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { isBlankBlogHtml, sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_BODY_LENGTH = 50000;

const updatePostSchema = z.object({
  title: z.string().min(1, { message: "is required" }).max(200).optional(),
  excerpt: z.string().max(300).nullable().optional(),
  body: z.string().max(MAX_BODY_LENGTH).optional(),
  coverImageUrl: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional()
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
  return { post };
}

export async function PATCH(request, context) {
  try {
    const { id } = await context.params;
    const { post, error } = await loadOwnedPost(request, id);
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

    // publishedAt is set the first time a post goes live and never moves again,
    // so re-saving a published post — or unpublishing and republishing it later
    // — does not reorder it in a chronological feed.
    const becomingPublished = input.status === "PUBLISHED" && post.status !== "PUBLISHED";

    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: {
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        coverImageUrl: input.coverImageUrl,
        status: input.status,
        publishedAt: becomingPublished ? new Date() : undefined
      }
    });

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
