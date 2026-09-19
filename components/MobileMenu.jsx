"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/i18n/LocaleProvider";
import { Icon } from "@/components/Icon";

const roleLinksByRole = {
  ARTIST: [
    { href: "/studio", labelKey: "nav.studioDashboard" },
    { href: "/studio/artworks", labelKey: "nav.manageArtworks" },
    { href: "/studio/portfolio", labelKey: "nav.portfolio" },
    { href: "/studio/blog", labelKey: "nav.journal" },
    { href: "/studio/commissions", labelKey: "nav.customArtworkRequests" },
    { href: "/studio/profile", labelKey: "nav.studioProfile" }
  ],
  BUYER: [
    { href: "/orders", labelKey: "nav.myOrders" },
    { href: "/commissions", labelKey: "nav.myCustomRequests" }
  ],
  ADMIN: [{ href: "/admin", labelKey: "nav.adminDashboard" }]
};

/**
 * The mobile nav drawer. There's no room on a phone for both a profile icon
 * and a hamburger, so on mobile this single drawer replaces the profile
 * menu entirely and carries every account and role link; desktop keeps
 * NavUserMenu instead.
 */
export function MobileMenu({ user }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const roleLinks = user ? roleLinksByRole[user.role] || [] : [];

  return (
    <>
      <button aria-label={t("nav.menu")} className="mobile-menu-trigger" onClick={() => setOpen(true)} type="button">
        <Icon name="menu" />
      </button>
      {open
        ? createPortal(
            <div aria-label={t("nav.menu")} aria-modal="true" className="mobile-drawer" role="dialog">
              <div className="mobile-drawer-backdrop" onClick={() => setOpen(false)} />
              <div className="mobile-drawer-panel">
                <div className="mobile-drawer-header">
                  <span>{t("nav.menu")}</span>
                  <button
                    aria-label={t("nav.closeMenu")}
                    className="mobile-drawer-close"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    &times;
                  </button>
                </div>
                <div className="mobile-drawer-body">
                  {user ? (
                    <div className="mobile-drawer-account">
                      <p className="user-menu-name">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="user-menu-email">{user.email}</p>
                    </div>
                  ) : null}
                  <nav className="mobile-drawer-links">
                    {roleLinks.map((link) => (
                      <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                        {t(link.labelKey)}
                      </Link>
                    ))}
                    {user ? (
                      <Link href="/account" onClick={() => setOpen(false)}>
                        {t("nav.accountSettings")}
                      </Link>
                    ) : (
                      <Link href="/login" onClick={() => setOpen(false)}>
                        {t("nav.signIn")}
                      </Link>
                    )}
                  </nav>
                  {user ? (
                    <button
                      className="mobile-drawer-signout"
                      disabled={isSigningOut}
                      onClick={handleSignOut}
                      type="button"
                    >
                      {isSigningOut ? t("nav.signingOut") : t("nav.signOut")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
