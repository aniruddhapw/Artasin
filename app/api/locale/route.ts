import { fail, handleApiError, ok } from "@/lib/api";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, viewerIsArtist } from "@/lib/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  try {
    const { locale } = await request.json();
    if (!isLocale(locale)) {
      return fail("Unsupported language", 422);
    }
    // Anyone may go back to English; other languages are for artists only.
    if (locale !== DEFAULT_LOCALE && !(await viewerIsArtist())) {
      return fail("Languages other than English are available to artists only", 403);
    }

    const response = ok({ locale });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
      // Readable by the client so the toggle can reflect the current choice;
      // it carries no privileges.
      httpOnly: false
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
