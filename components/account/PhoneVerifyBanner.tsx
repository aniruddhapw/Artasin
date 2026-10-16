import Link from "next/link";
import type { Translate } from "@/lib/i18n/shared";

/** Studio nudge to verify, shown only while WhatsApp verification is on. */
export function PhoneVerifyBanner({ t, href }: { t: Translate; href: string }) {
  return (
    <p className="verification-banner">
      {t("phoneVerify.banner")} <Link href={href}>{t("phoneVerify.bannerLink")}</Link>
    </p>
  );
}
