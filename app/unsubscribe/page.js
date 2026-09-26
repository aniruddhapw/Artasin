import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { UnsubscribeButton } from "@/components/newsletter/UnsubscribeButton";
import { prisma } from "@/lib/db";
import { getTranslations } from "@/lib/i18n";
import { readUnsubscribeToken } from "@/lib/unsubscribe";

export const metadata = {
  title: "Unsubscribe",
  robots: { index: false }
};

/** Enough of the address to recognise it, not enough to harvest it. */
function maskEmail(email) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

/**
 * Opened from the link in a newsletter notice. Loading it changes nothing:
 * mail scanners open links on their own, so unsubscribing takes a click.
 */
export default async function UnsubscribePage({ searchParams }) {
  const { token } = await searchParams;
  const { t } = await getTranslations();
  const userId = readUnsubscribeToken(token);
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { email: true, newsletterOptIn: true } })
    : null;

  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("unsubscribe.title")}</h1>
          {user ? (
            user.newsletterOptIn ? (
              <p>{t("unsubscribe.body", { email: maskEmail(user.email) })}</p>
            ) : (
              <p>{t("unsubscribe.done")}</p>
            )
          ) : (
            <p>{t("unsubscribe.invalid")}</p>
          )}
        </header>
        {user?.newsletterOptIn ? <UnsubscribeButton token={token} /> : null}
        <p className="field-hint">
          <Link className="text-link" href="/account">
            {t("unsubscribe.account")}
          </Link>
        </p>
      </main>
      <Footer variant="simple" />
    </>
  );
}
