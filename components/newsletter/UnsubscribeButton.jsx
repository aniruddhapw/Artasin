"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatApiError } from "@/lib/formErrors";

export function UnsubscribeButton({ token }) {
  const t = useT();
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function unsubscribe() {
    setState("working");
    setError("");
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, t("unsubscribe.failed"), t));
      }
      setState("done");
    } catch (unsubscribeError) {
      setError(unsubscribeError.message);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <p className="verification-banner" role="status">
        {t("unsubscribe.done")}
      </p>
    );
  }

  return (
    <div className="unsubscribe-actions">
      <button className="button button-primary" disabled={state === "working"} onClick={unsubscribe} type="button">
        {state === "working" ? t("unsubscribe.working") : t("unsubscribe.button")}
      </button>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
