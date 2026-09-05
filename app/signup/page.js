import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Create Account"
};

export default function SignupPage() {
  return (
    <AuthShell
      body="Join as a collector to buy and commission artwork, or apply as an artist to list work and manage studio requests."
      eyebrow="Create Account"
      title="Begin collecting or listing with intent."
    >
      <SignupForm />
    </AuthShell>
  );
}
