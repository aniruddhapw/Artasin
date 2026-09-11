import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { getTranslations } from "@/lib/i18n";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In"
};

export default async function LoginPage() {
  const { t } = await getTranslations();

  return (
    <AuthShell
      body={t("auth.signIn.body")}
      eyebrow={t("auth.signIn.eyebrow")}
      title={t("auth.signIn.headline")}
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
