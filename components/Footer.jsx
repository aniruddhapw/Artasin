import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getTranslations } from "@/lib/i18n";

export async function Footer({ variant = "full" }) {
  const { t } = await getTranslations();
  return (
    <footer className={`footer footer--${variant}`}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/">ARTISAN</Link>
          {variant === "full" ? (
            <p>
              A curated gallery space for the discerning collector. Minimalism,
              intent, and masterpiece quality.
            </p>
          ) : null}
        </div>
        <div className="footer-links">
          <div>
            {variant === "full" ? <span>Directory</span> : null}
            <Link href="/studio">{t("footer.artistResources")}</Link>
            <Link href="/requests">{t("footer.commissionGuide")}</Link>
          </div>
          <div>
            {variant === "full" ? <span>Legal</span> : null}
            <Link href="/privacy">{t("footer.privacy")}</Link>
            <Link href="/terms">{t("footer.terms")}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{t("footer.rights")}</p>
          {variant === "full" ? (
            <div className="footer-icons">
              <Icon name="globe" />
              <Icon name="mail" />
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
