"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/i18n/LocaleProvider";
import { Icon } from "@/components/Icon";

export function NavUserMenu({ user }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return (
      <Link aria-label={t("nav.signIn")} className="nav-profile" href="/login">
        <Icon name="user" />
      </Link>
    );
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="user-menu nav-profile">
      <button
        aria-expanded={open}
        aria-label={t("nav.accountMenu")}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Icon name="user" />
      </button>
      {open ? (
        <div className="user-menu-panel">
          <p className="user-menu-name">
            {user.firstName} {user.lastName}
          </p>
          <p className="user-menu-email">{user.email}</p>
          <div className="user-menu-links">
            {user.role === "ARTIST" ? (
              <>
                <Link href="/studio">{t("nav.studioDashboard")}</Link>
                <Link href="/studio/artworks">{t("nav.manageArtworks")}</Link>
                <Link href="/studio/commissions">{t("nav.customArtworkRequests")}</Link>
                <Link href="/studio/profile">{t("nav.studioProfile")}</Link>
              </>
            ) : null}
            {user.role === "BUYER" ? (
              <>
                <Link href="/orders">{t("nav.myOrders")}</Link>
                <Link href="/commissions">{t("nav.myCustomRequests")}</Link>
              </>
            ) : null}
            {user.role === "ADMIN" ? <Link href="/admin">{t("nav.adminDashboard")}</Link> : null}
            <Link href="/account">{t("nav.accountSettings")}</Link>
          </div>
          <button disabled={isSigningOut} onClick={handleSignOut} type="button">
            {isSigningOut ? t("nav.signingOut") : t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
