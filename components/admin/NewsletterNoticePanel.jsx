"use client";

import { useState } from "react";
import { formatApiError } from "@/lib/formErrors";

/**
 * One-time: subscribes everyone who joined before the signup checkbox and was
 * never asked, emailing each a notice with a one-click unsubscribe. The panel
 * is gone on the next visit once nobody is left.
 */
export function NewsletterNoticePanel({ count }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/newsletter", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, "Could not subscribe existing users"));
      }
      const failed = payload.syncFailures ? ` ${payload.syncFailures} could not be added to Resend; run npm run resend:sync to catch them up.` : "";
      // No refresh: the count would drop to zero and take this message with it.
      setResult(`Done. Subscribed and emailed ${payload.subscribed} ${payload.subscribed === 1 ? "person" : "people"}.${failed}`);
    } catch (runError) {
      setError(runError.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="admin-notice newsletter-notice-panel">
      <div>
        <h2>Newsletter: {count} existing {count === 1 ? "person has" : "people have"} never been asked</h2>
        <p>
          They joined before the signup checkbox. This subscribes them and sends each a short email saying so, with a
          one-click unsubscribe. Anyone who has unsubscribed, or unticked the box at signup, is left out. It takes about
          a second per person.
        </p>
      </div>
      <div className="artwork-status-actions" hidden={Boolean(result)}>
        {confirming ? (
          <>
            <button className="button button-primary" disabled={busy} onClick={run} type="button">
              {busy ? "Sending..." : `Subscribe and email ${count}`}
            </button>
            <button className="button button-secondary" disabled={busy} onClick={() => setConfirming(false)} type="button">
              Cancel
            </button>
          </>
        ) : (
          <button className="button button-primary" onClick={() => setConfirming(true)} type="button">
            Subscribe and notify
          </button>
        )}
      </div>
      {result ? <p role="status">{result}</p> : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
