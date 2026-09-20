import { AuthShell } from "@/components/auth/AuthShell";
import { getTranslations } from "@/lib/i18n";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password",
  alternates: { canonical: "/forgot-password" }
};

export default async function ForgotPasswordPage() {
  const { t } = await getTranslations();

  return (
    <AuthShell
      body={t("auth.forgot.body")}
      eyebrow={t("auth.recovery.eyebrow")}
      title={t("auth.forgot.headline")}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
