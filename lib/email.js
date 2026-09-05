import { Resend } from "resend";

const fromAddress = process.env.EMAIL_FROM || "ARTISAN <notifications@artasin.in>";

const providers = {
  console: {
    async send({ to, subject, html }) {
      console.log(`[email:console] to=${to} subject="${subject}"\n${html}`);
      return { id: "console-noop" };
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
    }
  }
};

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
