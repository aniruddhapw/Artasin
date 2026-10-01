import { NextResponse } from "next/server";
import { confirmFromWhatsApp } from "@/lib/phoneVerification";
import { extractCode, incomingTextMessages, isValidSignature, sendWhatsAppText } from "@/lib/whatsapp";

const SITE_NAME = "Artasin";

const replies = {
  verified: (name) =>
    `✅ Thanks${name ? `, ${name}` : ""}! Your phone number is verified on ${SITE_NAME}. You can go back to the site now.`,
  already: () => `✅ This number is already verified on ${SITE_NAME}. Nothing else to do.`,
  "wrong-number": () =>
    `This code was made for a different phone number. Send it from the phone whose number is on your ${SITE_NAME} account, or update the number in your account first.`,
  expired: () => `That code has expired. Go back to ${SITE_NAME} and tap "Verify on WhatsApp" for a new one.`,
  unknown: () => `We couldn't find that code. Go back to ${SITE_NAME} and tap "Verify on WhatsApp" for a new one.`,
  none: () => `Hi! This number is for verifying ${SITE_NAME} accounts. For anything else, write to support@artasin.in.`
};

/**
 * Meta checks the webhook URL once, when it's added in the app dashboard, by
 * asking us to echo a challenge back with the token we chose.
 */
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === token) {
    return new NextResponse(params.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Messages people send to Artasin's WhatsApp. Meta retries anything that
 * doesn't get a 200, so problems with one message are logged and the
 * request still succeeds; a forged request is refused outright.
 */
export async function POST(request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  for (const message of incomingTextMessages(payload)) {
    try {
      const code = extractCode(message.text);
      if (!code) {
        await sendWhatsAppText(message.from, replies.none());
        continue;
      }
      const { outcome, firstName } = await confirmFromWhatsApp(code, message.from);
      await sendWhatsAppText(message.from, replies[outcome](firstName));
    } catch (error) {
      console.error(`WhatsApp message ${message.id} from ${message.from} failed:`, error);
    }
  }

  return NextResponse.json({ received: true });
}
