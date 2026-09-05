import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Page Not Found"
};

export default function NotFound() {
  return (
    <>
      <Nav active="collections" />
      <main className="page request-page">
        <header className="request-header">
          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
        </header>
        <div className="stack-actions" style={{ maxWidth: 320 }}>
          <Link className="button button-primary" href="/gallery">
            Browse the Collection
          </Link>
          <Link className="button button-secondary" href="/">
            Back to Home
          </Link>
        </div>
      </main>
      <Footer variant="simple" />
    </>
  );
}
