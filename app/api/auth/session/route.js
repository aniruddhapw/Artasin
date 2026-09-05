import { ok } from "@/lib/api";
import { getAuthUser, publicUser } from "@/lib/auth";

export async function GET(request) {
  const user = await getAuthUser(request);
  return ok({ user: user ? publicUser(user) : null });
}
