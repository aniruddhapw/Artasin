import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { getTranslations } from "@/lib/i18n";
import { SOCIAL_LINKS } from "@/lib/socialLinks";

export async function Footer({ variant = "full" }: { variant?: "full" | "simple" }) {
  const { t } = await getTranslations();
  return (
    <footer className={`footer footer--${variant}`}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link className="footer-logo" href="/">
            <BrandLogo />
          </Link>
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
            <Link href="/about">{t("footer.about")}</Link>
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
          <div className="footer-icons">
            {SOCIAL_LINKS.map((link) => (
              <a
                aria-label={`ARTASIN on ${link.name}`}
                href={link.href}
                key={link.name}
                rel="noopener noreferrer"
                target="_blank"
                title={link.name}
              >
                <Icon name={link.icon} size={20} />
              </a>
            ))}
            <a aria-label="Email support" href="mailto:support@artasin.in" title="Email">
              <Icon name="mail" size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
