"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { formatApiError } from "@/lib/formErrors";

interface AnnouncementState {
  enabled: boolean;
  sent: { id: string; status: string; sentAt: string | null } | null;
  subject: string;
  previewHtml: string;
}

/**
 * Sends the 3D gallery announcement to newsletter subscribers, once. Loads its
 * state after the page so the admin dashboard never waits on Resend.
 */
export function GalleryAnnouncementPanel() {
  const [state, setState] = useState<AnnouncementState | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/announcements/gallery")
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(formatApiError(payload, "Could not load the announcement"));
        }
        if (!cancelled) {
          setState(payload);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: "test" | "send") {
    setBusy(action);
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/admin/announcements/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(formatApiError(payload, action === "test" ? "Could not send the test" : "Could not send the announcement"));
      }
      if (action === "test") {
        setResult(`Test sent to ${payload.testSentTo}. Check your inbox before sending to everyone.`);
      } else {
        setResult("Sent. Resend is delivering it to every subscriber now; you can follow it under Broadcasts in Resend.");
        setState((current) => (current ? { ...current, sent: { id: payload.broadcastId ?? "", status: "sent", sentAt: new Date().toISOString() } } : current));
      }
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  if (!state && !error) {
    return null;
  }

  const sentOn = state?.sent?.sentAt ? new Date(state.sent.sentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <section className="admin-notice newsletter-notice-panel">
      <div>
        <h2>Announce the 3D gallery</h2>
        {state?.sent ? (
          <p>Sent to newsletter subscribers{sentOn ? ` on ${sentOn}` : ""}. It can only go out once.</p>
        ) : (
          <p>
            Emails everyone subscribed to Artasin news about the new walk-through gallery, with a link to it. People who
            have unsubscribed are left out, and each email carries a one-click unsubscribe. Send yourself a test first.
          </p>
        )}
        {state && !state.enabled ? (
          <p className="auth-error" role="alert">
            The newsletter isn&apos;t set up on this deployment (RESEND_API_KEY, RESEND_SEGMENT_ID and
            RESEND_NEWSLETTER_TOPIC_ID), so only the test can be sent.
          </p>
        ) : null}
      </div>

      {state ? (
        <div className="artwork-status-actions">
          <button className="button button-secondary" onClick={() => setShowPreview((open) => !open)} type="button">
            {showPreview ? "Hide preview" : "Preview email"}
          </button>
          <button className="button button-secondary" disabled={busy !== null} onClick={() => run("test")} type="button">
            {busy === "test" ? "Sending..." : "Send me a test"}
          </button>
          {!state.sent && state.enabled ? (
            confirming ? (
              <>
                <button className="button button-primary" disabled={busy !== null} onClick={() => run("send")} type="button">
                  {busy === "send" ? "Sending..." : "Yes, send to all subscribers"}
                </button>
                <button className="button button-secondary" disabled={busy !== null} onClick={() => setConfirming(false)} type="button">
                  Cancel
                </button>
              </>
            ) : (
              <button className="button button-primary" disabled={busy !== null} onClick={() => setConfirming(true)} type="button">
                Send to subscribers
              </button>
            )
          ) : null}
        </div>
      ) : null}

      {showPreview && state ? (
        <div className="announcement-preview">
          <p>
            <strong>Subject:</strong> {state.subject}
          </p>
          <iframe sandbox="" srcDoc={state.previewHtml} title="Announcement email preview" />
        </div>
      ) : null}

      {result ? <p role="status">{result}</p> : null}
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
