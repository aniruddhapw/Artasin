import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getTranslations } from "@/lib/i18n";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set a New Password"
};

export default async function ResetPasswordPage() {
  const { t } = await getTranslations();

  return (
    <AuthShell
      body={t("auth.reset.body")}
      eyebrow={t("auth.recovery.eyebrow")}
      title={t("auth.reset.headline")}
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
