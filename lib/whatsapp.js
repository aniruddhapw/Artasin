import crypto from "node:crypto";

/**
 * Artasin's WhatsApp Business number, through Meta's WhatsApp Cloud API.
 *
 * It is used the other way round from an SMS code: rather than us sending a
 * code (which costs money on every channel), the person sends one to us. A
 * message WhatsApp delivers from a number proves they hold that number, and
 * receiving messages, and replying within 24 hours, is free.
 *
 * Everything is off until WHATSAPP_BUSINESS_NUMBER is set; see BACKEND.md.
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

/** The business number as digits only, or null when WhatsApp isn't set up. */
export function whatsappBusinessNumber() {
  const digits = (process.env.WHATSAPP_BUSINESS_NUMBER || "").replace(/\D/g, "");
  return digits || null;
}

export function isWhatsAppVerificationEnabled() {
  return Boolean(whatsappBusinessNumber());
}

export function verificationMessage(code) {
  return `ARTASIN ${code}`;
}

/** Opens WhatsApp (app or web) with the message typed out, ready to send. */
export function verificationLink(code, number = whatsappBusinessNumber()) {
  return `https://wa.me/${number}?text=${encodeURIComponent(verificationMessage(code))}`;
}

/**
 * The six-digit code in a message, or null. Accepts the message as we wrote
 * it and the ways people retype it: "ARTASIN 482913", "artasin-482913", or
 * just "482913".
 */
export function extractCode(text) {
  if (typeof text !== "string") {
    return null;
  }
  const match = text.match(/\bartasin\W*(\d{6})\b/i) || text.trim().match(/^(\d{6})$/);
  return match ? match[1] : null;
}

/**
 * Meta signs each webhook with the app secret. Anyone can POST to the URL,
 * so an unsigned or wrongly signed request must be ignored; otherwise it
 * could claim any number had sent any code.
 */
export function isValidSignature(rawBody, header, secret) {
  if (!secret || typeof header !== "string" || !header.startsWith("sha256=")) {
    return false;
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const given = header.slice("sha256=".length);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** The text messages in a webhook payload, with the sender in E.164. */
export function incomingTextMessages(payload) {
  const messages = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const message of change?.value?.messages || []) {
        if (message?.type === "text" && message.from) {
          messages.push({ id: message.id, from: `+${String(message.from).replace(/\D/g, "")}`, text: message.text?.body || "" });
        }
      }
    }
  }
  return messages;
}

/**
 * Replies on WhatsApp. Best effort: verification has already happened by
 * the time this runs, and the page confirms it on its own, so a failed reply
 * is logged rather than allowed to undo anything.
 */
export async function sendWhatsAppText(to, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.log(`[whatsapp:console] to=${to} ${body}`);
    return;
  }
  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "text",
        text: { body }
      })
    });
    if (!response.ok) {
      console.error(`WhatsApp reply to ${to} failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error(`WhatsApp reply to ${to} failed:`, error.message);
  }
}
