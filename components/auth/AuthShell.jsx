import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

export function AuthShell({ children, eyebrow, title, body }) {
  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link className="auth-brand" href="/">
          ARTISAN
        </Link>
        {/* Sign-in is the first screen an artist meets, so the language switch
            has to be reachable before they are through it. */}
        <LanguageToggle />
      </div>
      <section className="auth-grid">
        <aside className="auth-editorial">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{body}</span>
        </aside>
        <section className="auth-panel">{children}</section>
      </section>
    </main>
  );
}
