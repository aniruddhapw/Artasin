import Link from "next/link";

export function AuthShell({ children, eyebrow, title, body }) {
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/">
        ARTISAN
      </Link>
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
