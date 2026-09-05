import { created, fail, handleApiError } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return fail("Authentication required", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return fail("A file is required", 422);
    }
    if (file.size > MAX_BYTES) {
      return fail("File exceeds the 8MB limit", 422);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return fail("Unsupported file type", 422);
    }

    const provider = getStorageProvider();
    const url = await provider.save(file);

    return created({ url });
  } catch (error) {
    return handleApiError(error);
  }
}
