import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isUndeliverableEmail } from "../lib/email.js";
import { contactsEnabled, subscriptionFor, syncNewsletterContact } from "../lib/resendContacts.js";

/**
 * Brings Resend's contact list up to date with the users table.
 *
 * Run it once to seed the list, and again whenever a sync may have been lost —
 * signup swallows its own failures so a Resend outage cannot block an account
 * being created, which means the list can fall behind and this is how it
 * catches up. Every write is idempotent.
 *
 * Existing users arrive opted out, because none of them has been asked yet.
 * They land on the list so a later yes has somewhere to go, and receive
 * nothing until they give it.
 */

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const apply = process.argv.includes("--apply");

if (!contactsEnabled()) {
  console.error(
    "Resend contact syncing is not configured. Set RESEND_API_KEY, RESEND_SEGMENT_ID and\n" +
      "RESEND_NEWSLETTER_TOPIC_ID — see the Newsletter section of README.md."
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, firstName: true, lastName: true, newsletterOptIn: true },
    orderBy: { createdAt: "asc" }
  });

  const deliverable = users.filter((user) => !isUndeliverableEmail(user.email));
  const skipped = users.length - deliverable.length;
  const optedIn = deliverable.filter((user) => user.newsletterOptIn).length;

  console.log(
    `${users.length} users — ${deliverable.length} to sync ` +
      `(${optedIn} opted in, ${deliverable.length - optedIn} opted out), ${skipped} undeliverable.`
  );

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these to Resend.");
    return;
  }

  let synced = 0;
  const failures = [];
  for (const user of deliverable) {
    try {
      await syncNewsletterContact(user);
      synced += 1;
    } catch (error) {
      failures.push(`${user.email}: ${error.message}`);
    }
  }

  console.log(`\nSynced ${synced}/${deliverable.length}.`);
  if (failures.length) {
    console.error(`Failed:\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
