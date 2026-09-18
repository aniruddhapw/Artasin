import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

function configure() {
  if (configured) {
    return true;
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "support@artasin.in"}`,
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

// Fire-and-forget by design, same as sendEmail: a browser notification is a
// nice-to-have on top of the email that already went out, not something a
// message send should ever fail because of.
export async function sendPushToUser(userId, { title, body, url }) {
  if (!configure()) {
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          },
          JSON.stringify({ title, body, url })
        );
      } catch (error) {
        // 404/410 means the browser dropped this subscription (uninstalled,
        // cleared site data, expired) — the push service will never accept
        // it again, so stop storing it. Anything else is transient/unknown
        // and just gets logged.
        if (error.statusCode === 404 || error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else {
          console.error(`Push send failed for subscription ${subscription.id}:`, error.message);
        }
      }
    })
  );
}
