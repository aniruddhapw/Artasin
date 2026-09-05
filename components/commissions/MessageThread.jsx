"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MessageThread({ commissionRequestId, messages, currentUserId }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/commissions/${commissionRequestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to send message");
      }
      setBody("");
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="message-thread">
      <div className="message-list">
        {messages.length ? (
          messages.map((message) => (
            <div
              className={message.senderId === currentUserId ? "message-bubble is-self" : "message-bubble"}
              key={message.id}
            >
              <p className="message-meta">
                {message.sender.firstName} {message.sender.lastName[0]}. ·{" "}
                {new Date(message.createdAt).toLocaleDateString()}
              </p>
              <p>{message.body}</p>
            </div>
          ))
        ) : (
          <p className="empty-state-inline">No messages yet. Start the conversation below.</p>
        )}
      </div>
      <form className="message-form" onSubmit={handleSubmit}>
        <textarea
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a message..."
          rows={2}
          value={body}
        />
        {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
        <button className="small-outline" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
