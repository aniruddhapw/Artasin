import { AuthShell } from "@/components/auth/AuthShell";
import { getTranslations } from "@/lib/i18n";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account"
};

export default async function SignupPage() {
  const { t } = await getTranslations();

  return (
    <AuthShell
      body={t("auth.signUp.body")}
      eyebrow={t("auth.signUp.eyebrow")}
      title={t("auth.signUp.headline")}
    >
      <SignupForm />
    </AuthShell>
  );
}
