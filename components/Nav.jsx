import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NavSearch } from "@/components/NavSearch";
import { NavUserMenu } from "@/components/NavUserMenu";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { getAuthUser, publicUser } from "@/lib/auth";
import { navItems } from "@/data/artisan";
import { getTranslations } from "@/lib/i18n";

export async function Nav({ active = "collections" }) {
  const authUser = await getAuthUser();
  const user = authUser ? publicUser(authUser) : null;
  const { t } = await getTranslations();

  return (
    <nav className="top-nav">
      <div className="nav-inner">
        <Link className="brand" href="/">
          ARTISAN
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
          <LanguageToggle />
          {!user ? (
            <Link className="sign-in" href="/login">
              {t("nav.signIn")}
            </Link>
          ) : null}
          <NavSearch />
          <Link aria-label="Shopping bag" href={user ? "/orders" : "/login"}>
            <Icon name="bag" />
          </Link>
          <NavUserMenu user={user} />
        </div>
      </div>
    </nav>
  );
}
