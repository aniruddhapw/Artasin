import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How ARTISAN collects, uses, stores, and protects your personal data, and the rights you have over it."
};

const LAST_UPDATED = "8 September 2026";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Nav active="collections" />
      <main className="page legal-page">
        <header className="request-header">
          <p className="byline">Legal</p>
          <h1>Privacy Policy</h1>
          <p>Last updated: {LAST_UPDATED}</p>
        </header>

        <article className="legal-body">
          <section>
            <h2>1. Who we are</h2>
            <p>
              ARTISAN (&ldquo;ARTISAN&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an online marketplace at{" "}
              <strong>artasin.in</strong> where independent artists list original artwork for sale and accept
              custom commissions. The site is operated as a sole proprietorship by Aniruddha Wankhade.
            </p>
            <p>
              For any privacy question, data request, or complaint, contact our Grievance Officer at{" "}
              <a href="mailto:support@artasin.in">support@artasin.in</a>. We aim to acknowledge requests within
              72 hours and resolve them within 30 days.
            </p>
            <p className="legal-placeholder">
              [PLACEHOLDER — add your business address and Grievance Officer name here. Indian e-commerce and IT
              rules require both to be published.]
            </p>
          </section>

          <section>
            <h2>2. What we collect</h2>
            <p>We only collect what the marketplace actually needs to work.</p>

            <h3>Information you give us</h3>
            <ul>
              <li>
                <strong>Account details</strong> — your first and last name, email address, and password. Passwords
                are stored only as a bcrypt hash; we never store or see your actual password.
              </li>
              <li>
                <strong>Google Sign-In</strong> — if you sign in with Google, we receive your Google account ID,
                name, and verified email address. We do not receive your Google password, contacts, or any other
                Google data.
              </li>
              <li>
                <strong>Shipping details</strong> — the name, postal address, and any phone number you enter at
                checkout, so an artist can ship your purchase.
              </li>
              <li>
                <strong>Artist profile</strong> — if you sell on ARTISAN: your display name, studio URL, bio,
                discipline, location, and website.
              </li>
              <li>
                <strong>Listings and uploads</strong> — artwork titles, descriptions, prices, and images you
                upload.
              </li>
              <li>
                <strong>Commission briefs</strong> — the requirements, budget, timeline, and any reference images
                you submit with a commission request.
              </li>
              <li>
                <strong>Messages and meetings</strong> — messages you exchange with an artist or buyer on a
                commission thread, and meeting times you schedule.
              </li>
              <li>
                <strong>Reviews</strong> — the star rating and any written comment you leave after a delivered
                order. Reviews are public and display your first name and last initial.
              </li>
            </ul>

            <h3>Information we generate</h3>
            <ul>
              <li>
                <strong>Order records</strong> — what was bought, from whom, for how much, the platform commission
                and artist payout, order status, and any dispute or refund.
              </li>
              <li>
                <strong>Server logs</strong> — our hosting provider records standard technical data such as IP
                address, browser type, and requested pages for security and reliability purposes.
              </li>
            </ul>

            <h3>What we do not collect</h3>
            <ul>
              <li>
                We do not run advertising or analytics trackers. There is no Google Analytics, no advertising
                pixel, and no third-party behavioural tracking on this site.
              </li>
              <li>
                We do not collect payment card numbers. When card payments are enabled, they will be handled
                entirely by a PCI-compliant payment processor and card details will never reach our servers.
              </li>
              <li>We do not sell, rent, or trade your personal data to anyone, ever.</li>
            </ul>
          </section>

          <section>
            <h2>3. Cookies</h2>
            <p>
              We use only strictly necessary cookies. We do not use advertising, analytics, or cross-site tracking
              cookies, so there is no cookie banner to click through.
            </p>
            <ul>
              <li>
                <strong>artisan_session</strong> — keeps you signed in. It is an HttpOnly, SameSite=Lax cookie
                holding a signed session token, and expires after 7 days.
              </li>
              <li>
                <strong>g_oauth_state</strong> and <strong>g_oauth_redirect</strong> — set only while you are
                signing in with Google, to protect against cross-site request forgery and to return you to the
                right page. Both expire after 10 minutes and are deleted as soon as sign-in completes.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Why we use your data</h2>
            <ul>
              <li>To create and secure your account, and to keep you signed in.</li>
              <li>To list, display, and sell artwork, and to run the commission workflow.</li>
              <li>
                To process orders — which means sharing your shipping details with the artist fulfilling your
                order, and sharing your name with a buyer when you sell to them.
              </li>
              <li>
                To send transactional email you would expect: order confirmations, shipping and delivery updates,
                commission quotes and status changes, dispute outcomes, and artist verification decisions. These
                are service messages, not marketing. We do not send marketing email.
              </li>
              <li>To verify artists before their work goes on sale, as a trust and safety measure.</li>
              <li>To investigate disputes, prevent fraud and abuse, and comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>5. Who we share it with</h2>
            <p>
              We share personal data only with the service providers that make the marketplace function, and only
              to the extent each one needs:
            </p>
            <ul>
              <li>
                <strong>Other users</strong> — buyers&rsquo; shipping and contact details are shared with the artist
                fulfilling their order; artists&rsquo; public profile, listings, and reviews are visible to everyone.
              </li>
              <li>
                <strong>Vercel</strong> — website and application hosting.
              </li>
              <li>
                <strong>Neon</strong> — the managed PostgreSQL database where account, order, and listing data is
                stored.
              </li>
              <li>
                <strong>Cloudinary</strong> — storage and delivery of uploaded artwork and reference images.
              </li>
              <li>
                <strong>Resend</strong> (which delivers via Amazon SES) — sending the transactional emails
                described above.
              </li>
              <li>
                <strong>Google</strong> — only if you choose to sign in with Google.
              </li>
              <li>
                <strong>Payment processor</strong> — when card payments are enabled, a PCI-compliant processor will
                handle the transaction directly.
              </li>
            </ul>
            <p>
              We may also disclose data where we are legally required to, or where it is necessary to establish,
              exercise, or defend a legal claim.
            </p>
          </section>

          <section>
            <h2>6. Where your data is stored</h2>
            <p>
              Our database and hosting are located outside India (primarily in the United States), and our email
              provider delivers through infrastructure in the Asia-Pacific region. By using ARTISAN you understand
              that your personal data is transferred to and stored on servers outside India. We choose established
              providers that maintain appropriate technical and organisational safeguards.
            </p>
          </section>

          <section>
            <h2>7. How long we keep it</h2>
            <ul>
              <li>
                <strong>Account data</strong> — for as long as your account exists. If you ask us to delete your
                account, we remove your personal data within 30 days.
              </li>
              <li>
                <strong>Order and transaction records</strong> — retained after account deletion where we are
                required to keep them for tax, accounting, or legal purposes.
              </li>
              <li>
                <strong>Reviews</strong> — remain published after account deletion, but are anonymised.
              </li>
              <li>
                <strong>OAuth cookies</strong> — minutes. <strong>Session cookies</strong> — 7 days.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Your rights</h2>
            <p>
              Under India&rsquo;s Digital Personal Data Protection Act, 2023, and comparable laws elsewhere, you have
              the right to:
            </p>
            <ul>
              <li>Access the personal data we hold about you and know who we have shared it with.</li>
              <li>Correct or complete inaccurate or incomplete data.</li>
              <li>Request erasure of your data, subject to the retention rules above.</li>
              <li>Withdraw consent at any time, including by deleting your account.</li>
              <li>Nominate another person to exercise your rights in the event of death or incapacity.</li>
              <li>
                Raise a grievance with us, and escalate to the Data Protection Board of India if you are not
                satisfied with our response.
              </li>
            </ul>
            <p>
              To exercise any of these, email <a href="mailto:support@artasin.in">support@artasin.in</a> from the
              address on your account.
            </p>
          </section>

          <section>
            <h2>9. Security</h2>
            <p>
              The site is served over HTTPS. Passwords are hashed with bcrypt, sessions are signed JSON Web Tokens
              held in HttpOnly cookies that JavaScript cannot read, and access to studio, order, and admin pages is
              checked both at the edge and again against the database on every request. No system is perfectly
              secure, but we take these measures seriously and will notify affected users and the relevant
              authority if a breach puts your data at risk.
            </p>
          </section>

          <section>
            <h2>10. Children</h2>
            <p>
              ARTISAN is not intended for anyone under 18. We do not knowingly collect data from children. If you
              believe a child has given us personal data, contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2>11. Changes to this policy</h2>
            <p>
              If we change this policy we will update the date at the top of this page, and for significant changes
              we will notify you by email or with a notice on the site.
            </p>
          </section>

          <p className="legal-footer-note">
            Questions about this policy? Email <a href="mailto:support@artasin.in">support@artasin.in</a>. See also
            our <Link href="/terms">Terms of Service</Link>.
          </p>
        </article>
      </main>
      <Footer variant="simple" />
    </>
  );
}
