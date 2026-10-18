import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import type { ReactNode } from "react";

export function AuthShell({
  children,
  eyebrow,
  title,
  body
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Link className="auth-brand" href="/">
          <BrandLogo />
        </Link>
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
