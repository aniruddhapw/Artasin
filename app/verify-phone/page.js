import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifyPhoneStep } from "@/components/auth/VerifyPhoneStep";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthUser } from "@/lib/auth";
import { getTranslations } from "@/lib/i18n";
import { safeRedirectPath } from "@/lib/redirects";
import { isWhatsAppVerificationEnabled } from "@/lib/whatsapp";

export const metadata = {
  title: "Verify Your Phone Number",
  robots: { index: false }
};

/**
 * Offered straight after someone adds their number. Skippable: not everyone
 * has WhatsApp, and a missed step here can be done later from the account
 * page. Steps aside entirely while WhatsApp isn't set up.
 */
export default async function VerifyPhonePage({ searchParams }) {
  const params = await searchParams;
  const user = await getAuthUser();
  const fallback = user?.role === "ARTIST" ? "/studio" : "/";
  const next = safeRedirectPath(params?.redirect, fallback);

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/verify-phone?redirect=${encodeURIComponent(next)}`)}`);
  }
  if (!user.phone) {
    redirect(`/add-phone?redirect=${encodeURIComponent(next)}`);
  }
  if (!isWhatsAppVerificationEnabled() || user.phoneVerifiedAt) {
    redirect(next);
  }

  const { t } = await getTranslations();
  return (
    <AuthShell body={t("phoneVerify.pageBody")} eyebrow={t("phoneVerify.eyebrow")} title={t("phoneVerify.headline")}>
      <div className="auth-form-header">
        <h2>{t("phoneVerify.title")}</h2>
      </div>
      <VerifyPhoneStep next={next} phone={user.phone} />
      <p className="auth-note">
        <Link href={next}>{t("phoneVerify.skip")}</Link>
      </p>
    </AuthShell>
  );
}
