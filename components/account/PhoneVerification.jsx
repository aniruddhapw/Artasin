"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";

const POLL_MS = 3000;

/**
 * Verifies a phone number by having its owner send a code to Artasin on
 * WhatsApp. Opening WhatsApp is a second click on purpose: the code has to
 * be fetched first, and browsers block windows opened after a wait.
 */
export function PhoneVerification({ phone, verified: initiallyVerified, onVerified }) {
  const t = useT();
  const router = useRouter();
  const [verified, setVerified] = useState(initiallyVerified);
  const [request, setRequest] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setVerified(initiallyVerified);
    setRequest(null);
  }, [initiallyVerified, phone]);

  // While a code is out, ask every few seconds whether it has come back.
  useEffect(() => {
    if (!request || verified) {
      return undefined;
    }
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/account/phone-verification", { cache: "no-store" });
        const payload = await response.json();
        if (!stopped && payload.verified) {
          setVerified(true);
          setRequest(null);
          router.refresh();
          onVerified?.();
        }
      } catch {
        // A dropped poll is fine; the next one tries again.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [request, verified, router, onVerified]);

  async function start() {
    setIsStarting(true);
    setError("");
    try {
      const response = await fetch("/api/account/phone-verification", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("phoneVerify.startError"), t));
      }
      if (payload.verified) {
        setVerified(true);
        return;
      }
      setRequest(payload);
    } catch (startError) {
      setError(startError.message);
    } finally {
      setIsStarting(false);
    }
  }

  if (verified) {
    return (
      <p className="phone-verified" role="status">
        <span aria-hidden="true">✓</span> {t("phoneVerify.verified", { phone })}
      </p>
    );
  }

  return (
    <div className="phone-verify">
      {request ? (
        <>
          <ol className="phone-verify-steps">
            <li>{t("phoneVerify.stepOpen")}</li>
            <li>{t("phoneVerify.stepSend", { message: request.message })}</li>
            <li>{t("phoneVerify.stepWait")}</li>
          </ol>
          <a className="button button-primary phone-verify-open" href={request.link} rel="noreferrer" target="_blank">
            {t("phoneVerify.open")}
          </a>
          <p className="phone-verify-manual">
            {t("phoneVerify.manual", { message: request.message, number: `+${request.link.match(/wa\.me\/(\d+)/)[1]}` })}
          </p>
          <p className="phone-verify-waiting" role="status">
            {t("phoneVerify.waiting")}
          </p>
        </>
      ) : (
        <>
          <p className="phone-verify-intro">{t("phoneVerify.intro", { phone })}</p>
          <button className="button button-primary" disabled={isStarting} onClick={start} type="button">
            {isStarting ? t("phoneVerify.starting") : t("phoneVerify.start")}
          </button>
        </>
      )}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </div>
  );
}
