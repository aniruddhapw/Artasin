import Link from "next/link";
import { Icon } from "@/components/Icon";

export function Footer({ variant = "full" }) {
  return (
    <footer className={`footer footer--${variant}`}>
      <div className="footer-grid">
        <div className="footer-brand">
          <Link href="/">ARTISAN</Link>
          {variant === "full" ? (
            <p>
              A curated gallery space for the discerning collector. Minimalism,
              intent, and masterpiece quality.
            </p>
          ) : null}
        </div>
        <div className="footer-links">
          <div>
            {variant === "full" ? <span>Directory</span> : null}
            <Link href="/studio">Artist Resources</Link>
            <Link href="/requests">Commission Guide</Link>
          </div>
          <div>
            {variant === "full" ? <span>Legal</span> : null}
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 Artisan Gallery. All rights reserved.</p>
          {variant === "full" ? (
            <div className="footer-icons">
              <Icon name="globe" />
              <Icon name="mail" />
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
