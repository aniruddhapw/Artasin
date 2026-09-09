import { z } from "zod";
import { created, handleApiError } from "@/lib/api";
import { createSessionToken, hashPassword, publicUser, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

const signupSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["BUYER", "ARTIST"]).default("BUYER"),
  artist: z
    .object({
      displayName: z.string().min(1),
      slug: z
        .string()
        .min(3, "must be at least 3 characters")
        .regex(/^[a-z0-9-]+$/, "can only use lowercase letters, numbers, and hyphens"),
      discipline: z.string().optional(),
      location: z.string().optional()
    })
    .optional()
});

export async function POST(request) {
  try {
    const input = signupSchema.parse(await request.json());
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        artistProfile:
          input.role === "ARTIST"
            ? {
                create: {
                  displayName:
                    input.artist?.displayName || `${input.firstName} ${input.lastName}`,
                  slug: input.artist?.slug || `${input.firstName}-${input.lastName}`.toLowerCase(),
                  discipline: input.artist?.discipline,
                  location: input.artist?.location
                }
              }
            : undefined
      },
      include: { artistProfile: true }
    });

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return created({ user: publicUser(user), token });
  } catch (error) {
    return handleApiError(error);
  }
}
