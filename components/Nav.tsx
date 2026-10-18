import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icon";
import { MobileMenu } from "@/components/MobileMenu";
import { NavSearch } from "@/components/NavSearch";
import { NavUserMenu } from "@/components/NavUserMenu";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { getAuthUser, publicUser } from "@/lib/auth";
import { navItems } from "@/data/artisan";
import { getCartCount } from "@/lib/cart";
import { getTranslations } from "@/lib/i18n";
import type { NavItem } from "@/data/artisan";

/**
 * `immersive` hides the bar on phones (and phones held sideways), for a page
 * like the 3D gallery that needs the whole screen and has its own way back.
 */
export async function Nav({ active, immersive = false }: { active?: NavItem["key"]; immersive?: boolean }) {
  const authUser = await getAuthUser();
  const user = authUser ? publicUser(authUser) : null;
  const { t } = await getTranslations();
  const cartCount = authUser ? await getCartCount(authUser.id) : 0;

  return (
    <nav className={immersive ? "top-nav top-nav--immersive" : "top-nav"}>
      <div className="nav-inner">
        <Link className="brand" href="/">
          <BrandLogo />
        </Link>
        <div className="nav-links">
          {navItems.map((item) => (
            <Link
              className={item.key === active ? "active" : ""}
              href={item.href}
              key={item.key}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          {/* Marathi is for artists using their studio, so only they see the switch. */}
          {user?.role === "ARTIST" ? <LanguageToggle /> : null}
          {!user ? (
            <Link className="sign-in" href="/login">
              {t("nav.signIn")}
            </Link>
          ) : null}
          {user ? (
            <span className="nav-greeting">{t("nav.greeting", { name: user.firstName })}</span>
          ) : null}
          <NavSearch />
          <Link
            aria-label={cartCount ? t("cart.itemCount", { count: cartCount }) : t("cart.title")}
            className="cart-link"
            href={user ? "/cart" : "/login?redirect=/cart"}
          >
            <Icon name="bag" />
            {cartCount ? <span className="cart-badge">{cartCount}</span> : null}
          </Link>
          <NavUserMenu user={user} />
          <MobileMenu user={user} />
        </div>
      </div>
    </nav>
  );
}
