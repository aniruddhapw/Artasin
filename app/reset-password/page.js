import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Set a New Password"
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      body="Choose a new password for your account. This link works once and expires an hour after it was sent."
      eyebrow="Account Recovery"
      title="Set a new password."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
