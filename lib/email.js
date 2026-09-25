import { Resend } from "resend";

const fromAddress = process.env.EMAIL_FROM || "ARTASIN <notifications@artasin.in>";

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
    async sendBatch(recipients, { subject, html }) {
      for (const to of recipients) {
        console.log(`[email:console] to=${to} subject="${subject}"\n${html}`);
      }
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
      const { data, error } = await resend.emails.send({ from: fromAddress, to, subject, html });
      if (error) {
        throw new Error(error.message || "Failed to send email via Resend");
      }
      return data;
    },
    async sendBatch(recipients, { subject, html }) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured");
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      for (let i = 0; i < recipients.length; i += BATCH_CHUNK_SIZE) {
        const chunk = recipients.slice(i, i + BATCH_CHUNK_SIZE);
        const { error } = await resend.batch.send(
          chunk.map((to) => ({ from: fromAddress, to, subject, html }))
        );
        if (error) {
          throw new Error(error.message || "Failed to send batch email via Resend");
        }
      }
    },
    async sendEach(messages) {
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured");
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      for (let i = 0; i < messages.length; i += BATCH_CHUNK_SIZE) {
        const chunk = messages.slice(i, i + BATCH_CHUNK_SIZE);
        const { error } = await resend.batch.send(
          chunk.map(({ to, subject, html }) => ({ from: fromAddress, to, subject, html }))
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
 * Unlike sendEmail/sendBulkEmail this deliberately throws rather than
 * swallowing: those exist so a broken provider never blocks the order or
 * commission that triggered them, whereas here sending *is* the operation an
 * admin asked for, and silently reporting success would be a lie.
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

/**
 * For broadcasts (e.g. "a new post was published") rather than a single
 * transactional email — same content, many recipients, each addressed only
 * to themselves.
 *
 * Returns what happened instead of nothing. It still swallows a provider
 * failure, because publishing a post should not roll back over a broken
 * mailer, but a caller that wants to know can now ask.
 */
export async function sendBulkEmail(recipients, { subject, html }) {
  const { deliverable, skipped } = splitUndeliverable(recipients, (email) => email);
  if (!deliverable.length) {
    return { sent: 0, skipped, failed: false };
  }
  try {
    const provider = getEmailProvider();
    await provider.sendBatch(deliverable, { subject, html });
    return { sent: deliverable.length, skipped, failed: false };
  } catch (error) {
    console.error(
      `Bulk email "${subject}" failed for all ${deliverable.length} recipients:`,
      error.message
    );
    return { sent: 0, skipped, failed: true };
  }
}
