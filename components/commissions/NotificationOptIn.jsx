"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/lib/pushClient";

// Shown inline on a message thread so the prompt appears exactly where it's
// relevant — right before someone sends or reads a reply — rather than as a
// generic site-wide popup. If permission was already granted on a previous
// visit, this re-subscribes silently (covers a cleared subscription row
// without asking the user to click anything again) and renders nothing.
export function NotificationOptIn() {
  const [permission, setPermission] = useState(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === "granted") {
      subscribeToPush().catch(() => {});
    }
  }, []);

  if (permission !== "default") {
    return null;
  }

  async function handleEnable() {
    setIsSubscribing(true);
    const result = await subscribeToPush();
    setPermission(result.ok ? "granted" : (typeof Notification !== "undefined" ? Notification.permission : "denied"));
    setIsSubscribing(false);
  }

  return (
    <button
      className="small-outline notification-optin"
      disabled={isSubscribing}
      onClick={handleEnable}
      type="button"
    >
      {isSubscribing ? "Enabling..." : "Get notified in this browser when they reply"}
    </button>
  );
}
