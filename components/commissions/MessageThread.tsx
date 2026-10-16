"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { NotificationOptIn } from "@/components/commissions/NotificationOptIn";
import { formatApiError } from "@/lib/formErrors";
import { errorMessage } from "@/lib/errorMessage";
import type { Message, User } from "@prisma/client";

/** A message as the commission pages load it, with who sent it. */
export type ThreadMessage = Pick<Message, "id" | "body" | "createdAt" | "senderId"> & {
  sender: Pick<User, "firstName" | "lastName">;
};

export function MessageThread({
  commissionRequestId,
  messages,
  currentUserId
}: {
  commissionRequestId: string;
  messages: readonly ThreadMessage[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        throw new Error(formatApiError(payload, "Unable to send message"));
      }
      setBody("");
      router.refresh();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="message-thread">
      <NotificationOptIn />
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
