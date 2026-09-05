"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MeetingScheduler({ commissionRequestId, meetings }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const date = formData.get("date");
    const time = formData.get("time");

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionRequestId,
          scheduledAt: new Date(`${date}T${time}`).toISOString(),
          durationMinutes: Number(formData.get("durationMinutes")),
          meetingType: formData.get("meetingType"),
          notes: formData.get("notes") || undefined
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to schedule meeting");
      }
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="meeting-scheduler">
      {meetings.length ? (
        <ul className="meeting-list">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <strong>{new Date(meeting.scheduledAt).toLocaleString()}</strong>
              <span>
                {meeting.meetingType} · {meeting.durationMinutes} min · {meeting.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state-inline">No meetings scheduled yet.</p>
      )}

      {isOpen ? (
        <form className="meeting-form" onSubmit={handleSubmit}>
          <div className="auth-two-col">
            <label>
              <span>Date</span>
              <input name="date" required type="date" />
            </label>
            <label>
              <span>Time</span>
              <input name="time" required type="time" />
            </label>
          </div>
          <div className="auth-two-col">
            <label>
              <span>Duration</span>
              <select defaultValue="30" name="durationMinutes">
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </label>
            <label>
              <span>Type</span>
              <select defaultValue="Video call" name="meetingType">
                <option>Video call</option>
                <option>Phone call</option>
                <option>In-person studio visit</option>
              </select>
            </label>
          </div>
          <label>
            <span>Notes (Optional)</span>
            <input name="notes" type="text" />
          </label>
          {error ? <p className="auth-error auth-error-inline">{error}</p> : null}
          <div className="meeting-form-actions">
            <button className="small-outline" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Scheduling..." : "Confirm Meeting"}
            </button>
            <button className="small-outline" onClick={() => setIsOpen(false)} type="button">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="small-outline" onClick={() => setIsOpen(true)} type="button">
          Request Meeting
        </button>
      )}
    </div>
  );
}
