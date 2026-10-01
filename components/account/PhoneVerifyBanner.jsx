import Link from "next/link";

/** Studio nudge to verify, shown only while WhatsApp verification is on. */
export function PhoneVerifyBanner({ t, href }) {
  return (
    <p className="verification-banner">
      {t("phoneVerify.banner")} <Link href={href}>{t("phoneVerify.bannerLink")}</Link>
    </p>
  );
}
