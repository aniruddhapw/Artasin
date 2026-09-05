import { z } from "zod";
import { fail, handleApiError, ok } from "@/lib/api";
import { createSessionToken, publicUser, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export async function POST(request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { artistProfile: true }
    });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return fail("Invalid email or password", 401);
    }

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return ok({ user: publicUser(user), token });
  } catch (error) {
    return handleApiError(error);
  }
}
