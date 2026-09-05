import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In"
};

export default function LoginPage() {
  return (
    <AuthShell
      body="Access saved collections, commission briefs, purchase history, and artist studio tools."
      eyebrow="Collector Access"
      title="Return to your private gallery."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
