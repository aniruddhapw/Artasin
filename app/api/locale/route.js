import { fail, handleApiError, ok } from "@/lib/api";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request) {
  try {
    const { locale } = await request.json();
    if (!isLocale(locale)) {
      return fail("Unsupported language", 422);
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
