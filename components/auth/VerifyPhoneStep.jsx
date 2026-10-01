"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { PhoneVerification } from "@/components/account/PhoneVerification";

/** The verification on its own page: once it succeeds, carry on. */
export function VerifyPhoneStep({ next, phone }) {
  const router = useRouter();
  const carryOn = useCallback(() => {
    setTimeout(() => router.push(next), 1500);
  }, [next, router]);
  return <PhoneVerification onVerified={carryOn} phone={phone} verified={false} />;
}
