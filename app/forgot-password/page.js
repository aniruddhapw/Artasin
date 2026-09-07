import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset Password"
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      body="Enter the email on your account and we'll send you a secure link to set a new password."
      eyebrow="Account Recovery"
      title="Let's get you back in."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
