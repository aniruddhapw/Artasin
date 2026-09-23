"use client";

import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

export function PhoneReminderButton({ pending }) {
  const [confirming, setConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function send() {
    setIsSending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/phone-reminder", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Could not send the reminder"));
      }
      setResult(`Reminder sent to ${payload.sent} ${payload.sent === 1 ? "person" : "people"}.`);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setIsSending(false);
      setConfirming(false);
    }
  }

  if (result) {
    return <p className="account-success" role="status">{result}</p>;
  }

  return (
    <div className="artwork-status-actions">
      {confirming ? (
        <>
          <button className="small-outline" disabled={isSending} onClick={send} type="button">
            {isSending ? "Sending…" : `Confirm — email ${pending}`}
          </button>
          <button className="small-outline" disabled={isSending} onClick={() => setConfirming(false)} type="button">
            Cancel
          </button>
        </>
      ) : (
        <button className="small-outline" onClick={() => setConfirming(true)} type="button">
          Send reminder to {pending}
        </button>
      )}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </div>
  );
}
