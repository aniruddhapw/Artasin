import { z } from "zod";
import { created, handleApiError, rateLimited } from "@/lib/api";
import { createSessionToken, hashPassword, publicUser, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { phoneSchema } from "@/lib/phone";
import { syncNewsletterContactQuietly } from "@/lib/resendContacts";
import { checkRateLimit, rateLimitKeyForIp } from "@/lib/rateLimit";

const signupSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, "must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: phoneSchema,
  whatsappOptIn: z.boolean().default(false),
  newsletterOptIn: z.boolean().default(false),
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
    // Signups don't have a stable identifier to key off before the account
    // exists (unlike login/forgot-password, which can key on the target
    // email), so this is IP-only — the main lever available against a
    // script creating many accounts from one source.
    const ipLimit = await checkRateLimit(rateLimitKeyForIp("signup", request), {
      max: 10,
      windowMs: 60 * 60 * 1000
    });
    if (ipLimit.limited) {
      return rateLimited(ipLimit.retryAfterSeconds);
    }

    const input = signupSchema.parse(await request.json());
    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        whatsappOptIn: input.whatsappOptIn,
        newsletterOptIn: input.newsletterOptIn,
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

    // Everyone is added to the contact list; the topic subscription is what
    // the checkbox decides. An opted-out contact costs nothing and means a
    // later yes does not depend on us having remembered them.
    await syncNewsletterContactQuietly(user);

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return created({ user: publicUser(user), token });
  } catch (error) {
    return handleApiError(error);
  }
}
