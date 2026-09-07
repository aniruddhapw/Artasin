import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NavSearch } from "@/components/NavSearch";
import { NavUserMenu } from "@/components/NavUserMenu";
import { getAuthUser, publicUser } from "@/lib/auth";
import { navItems } from "@/data/artisan";

export async function Nav({ active = "collections" }) {
  const authUser = await getAuthUser();
  const user = authUser ? publicUser(authUser) : null;

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
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          {!user ? (
            <Link className="sign-in" href="/login">
              Sign In
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
