import { redirect } from "next/navigation";
import { AddPhoneForm } from "@/components/auth/AddPhoneForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { safeRedirectPath } from "@/lib/redirects";

export const metadata = {
  title: "Add Your Phone Number",
  robots: { index: false }
};

/**
 * The signup form asks for a phone number, but "Continue with Google" skips
 * the form, and accounts from before the field existed never had one. Both
 * are sent here after signing in.
 */
export default async function AddPhonePage({ searchParams }) {
  const params = await searchParams;
  const user = await getAuthUser();
  const fallback = user?.role === "ARTIST" ? "/studio" : "/";
  const next = safeRedirectPath(params?.redirect, fallback);

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/add-phone?redirect=${encodeURIComponent(next)}`)}`);
  }
  if (user.phone || user.role === "ADMIN") {
    redirect(next);
  }

  const { t } = await getTranslations();
  return (
    <AuthShell body={t("auth.addPhone.body")} eyebrow={t("auth.addPhone.eyebrow")} title={t("auth.addPhone.headline")}>
      <AddPhoneForm firstName={user.firstName} next={next} />
    </AuthShell>
  );
}
