import { z } from "zod";
import { fail, handleApiError, ok, rateLimited } from "@/lib/api";
import { createSessionToken, publicUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkRateLimit, rateLimitKeyForIp, rateLimitKeyForValue } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export async function POST(request) {
  try {
    const input = loginSchema.parse(await request.json());

    // Two independent buckets: one IP hammering many accounts (credential
    // stuffing) and many sources hammering one account (targeted brute
    // force) are different attacks and each needs its own limit.
    const ipLimit = await checkRateLimit(rateLimitKeyForIp("login", request), {
      max: 20,
      windowMs: 15 * 60 * 1000
    });
    if (ipLimit.limited) {
      return rateLimited(ipLimit.retryAfterSeconds);
    }
    const emailLimit = await checkRateLimit(rateLimitKeyForValue("login", input.email), {
      max: 8,
      windowMs: 15 * 60 * 1000
    });
    if (emailLimit.limited) {
      return rateLimited(emailLimit.retryAfterSeconds);
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { artistProfile: true }
    });

    if (!user) {
      return fail("Invalid email or password", 401);
    }
    if (!user.passwordHash) {
      return fail("This account uses Google Sign-In. Continue with Google to log in.", 401);
    }
    if (!(await verifyPassword(input.password, user.passwordHash))) {
      return fail("Invalid email or password", 401);
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return ok({ user: publicUser(user), token });
  } catch (error) {
    return handleApiError(error);
  }
}
