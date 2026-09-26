import Link from "next/link";
import { Icon } from "@/components/Icon";
import { MobileMenu } from "@/components/MobileMenu";
import { NavSearch } from "@/components/NavSearch";
import { NavUserMenu } from "@/components/NavUserMenu";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { getAuthUser, publicUser } from "@/lib/auth";
import { navItems } from "@/data/artisan";
import { getCartCount } from "@/lib/cart";
import { getTranslations } from "@/lib/i18n";

export async function Nav({ active }) {
  const authUser = await getAuthUser();
  const user = authUser ? publicUser(authUser) : null;
  const { t } = await getTranslations();
  const cartCount = user ? await getCartCount(authUser.id) : 0;

  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <Link className="brand brand-logo-link" href="/">
          {/* Cut from the brand artwork onto transparent, for the navy bar; 3x the displayed size. */}
          <img alt="ARTASIN" className="brand-logo" height={180} src="/brand/artasin-logo.png" width={513} />
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
          {user?.role !== "BUYER" ? <LanguageToggle /> : null}
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
