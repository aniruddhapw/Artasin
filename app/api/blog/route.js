import { z } from "zod";
import { created, fail, handleApiError, ok } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureSlug } from "@/lib/slug";

const MAX_BODY_LENGTH = 20000;

const createPostSchema = z.object({
  title: z.string().min(1, { message: "is required" }).max(200),
  excerpt: z.string().max(300).optional(),
  body: z.string().min(1, { message: "is required" }).max(MAX_BODY_LENGTH),
  coverImageUrl: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT")
});

async function requireArtist(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: fail("Authentication required", 401) };
  }
  if (!user.artistProfile) {
    return { error: fail("Only artists can write blog posts", 403) };
  }
  return { artistId: user.artistProfile.id };
}

/** Two posts can share a title; the URL still has to be unique across the site. */
async function uniqueBlogSlug(preferred) {
  const base = ensureSlug(preferred, "post");
  let candidate = base;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const clash = await prisma.blogPost.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash) {
      return candidate;
    }
    candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function GET(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }
    const posts = await prisma.blogPost.findMany({
      where: { artistId },
      orderBy: { createdAt: "desc" }
    });
    return ok({ posts });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const { artistId, error } = await requireArtist(request);
    if (error) {
      return error;
    }

    const input = createPostSchema.parse(await request.json());
    const slug = await uniqueBlogSlug(input.title);

    const post = await prisma.blogPost.create({
      data: {
        artistId,
        title: input.title,
        slug,
        excerpt: input.excerpt || null,
        body: input.body,
        coverImageUrl: input.coverImageUrl || null,
        status: input.status,
        publishedAt: input.status === "PUBLISHED" ? new Date() : null
      }
    });

    return created({ post });
  } catch (error) {
    return handleApiError(error);
  }
}
