import { Resend } from "resend";

/**
 * Read at call time, not import time, so a deploy can change it — and so the
 * broadcast sender, which lives in its own module, resolves the same address
 * rather than keeping a second copy of the default.
 */
export function senderAddress() {
  return process.env.EMAIL_FROM || "ARTASIN <notifications@artasin.in>";
}

// Resend's batch endpoint takes up to 100 messages per call — each with its
// own `to`, so recipients never see each other's addresses the way a shared
// `to`/`bcc` list would expose them.
const BATCH_CHUNK_SIZE = 100;

const providers = {
  console: {
    async send({ to, subject, html }) {
      console.log(`[email:console] to=${to} subject="${subject}"\n${html}`);
      return { id: "console-noop" };
    },
    async sendEach(messages) {
      for (const { to, subject, html } of messages) {
        console.log(`[email:console] to=${to} subject="${subject}"\n${html}`);
      }
    }
  },
  resend: {
    async send({ to, subject, html }) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured");
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({ from: senderAddress(), to, subject, html });
      if (error) {
        throw new Error(error.message || "Failed to send email via Resend");
      }
      return data;
    },
    async sendEach(messages) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured");
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      for (let i = 0; i < messages.length; i += BATCH_CHUNK_SIZE) {
        const chunk = messages.slice(i, i + BATCH_CHUNK_SIZE);
        const { error } = await resend.batch.send(
          chunk.map(({ to, subject, html }) => ({ from: senderAddress(), to, subject, html }))
        );
        if (error) {
          throw new Error(error.message || "Failed to send batch email via Resend");
        }
      }
    }
  }
};

/**
 * RFC 2606 reserves these domains for documentation and testing, so mail can
 * never be delivered to them. Resend rejects an entire batch containing even
 * one, and the seeded demo accounts use example.com — so a single demo row
 * left in a real database silently blocks every genuine recipient with it.
 *
 * The reserved names match as a whole domain as well as a suffix, so bare
 * `user@localhost` is caught alongside `user@box.localhost`.
 */
const UNDELIVERABLE_EMAIL = /@(?:example\.(?:com|net|org|edu)|(?:[^@]*\.)?(?:test|invalid|localhost|example))$/i;

export function isUndeliverableEmail(email) {
  return UNDELIVERABLE_EMAIL.test(email || "");
}

/**
 * Drops undeliverable addresses before the provider ever sees them.
 *
 * This lives in the transport rather than at each call site on purpose. One
 * reserved-domain address costs every real recipient in the batch their email,
 * and the failure is invisible — so relying on callers to remember the filter
 * means the omission is only ever found by noticing that an announcement
 * nobody acknowledged never actually arrived.
 */
function splitUndeliverable(items, toEmail) {
  const deliverable = items.filter((item) => !isUndeliverableEmail(toEmail(item)));
  return { deliverable, skipped: items.length - deliverable.length };
}

export function getEmailProvider() {
  const name = process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "console");
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown email provider: ${name}`);
  }
  return { name, ...provider };
}

export async function sendEmail({ to, subject, html }) {
  try {
    const provider = getEmailProvider();
    return await provider.send({ to, subject, html });
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return null;
  }
}

/**
 * A broadcast where each recipient gets their own rendered body — addressing
 * people by name, or branching copy on whether they are an artist.
 *
 * Unlike sendEmail this deliberately throws rather than swallowing: that one
 * exists so a broken provider never blocks the order or commission that
 * triggered it, whereas here sending *is* the operation an admin asked for,
 * and silently reporting success would be a lie.
 */
export async function sendPersonalizedEmails(messages) {
  const { deliverable } = splitUndeliverable(messages, (message) => message.to);
  if (!deliverable.length) {
    return 0;
  }
  const provider = getEmailProvider();
  await provider.sendEach(deliverable);
  return deliverable.length;
}

