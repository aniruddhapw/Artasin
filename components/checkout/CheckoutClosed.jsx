import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { getTranslations } from "@/lib/i18n";

/** Shown in place of the cart and checkout while online payments aren't live. */
export async function CheckoutClosed() {
  const { t } = await getTranslations();
  return (
    <>
      <Nav />
      <main className="page request-page">
        <header className="request-header">
          <h1>{t("checkout.closed.title")}</h1>
          <p>{t("checkout.closed.body")}</p>
        </header>
        <div className="stack-actions">
          <Link className="button button-primary" href="/gallery">
            {t("checkout.closed.browse")}
          </Link>
          <Link className="button button-secondary" href="/requests">
            {t("checkout.closed.requests")}
          </Link>
        </div>
      </main>
      <Footer variant="simple" />
    </>
  );
}
