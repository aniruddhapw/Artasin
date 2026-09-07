import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export const metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern buying, selling, and commissioning original artwork on the ARTISAN marketplace."
};

const LAST_UPDATED = "8 September 2026";

export default function TermsPage() {
  return (
    <>
      <Nav active="collections" />
      <main className="page legal-page">
        <header className="request-header">
          <p className="byline">Legal</p>
          <h1>Terms of Service</h1>
          <p>Last updated: {LAST_UPDATED}</p>
        </header>

        <article className="legal-body">
          <section>
            <h2>1. About these terms</h2>
            <p>
              These terms are an agreement between you and ARTISAN, an online marketplace at{" "}
              <strong>artasin.in</strong> operated as a sole proprietorship by Aniruddha Wankhade. By creating an
              account, browsing, buying, selling, or commissioning work here, you agree to them. If you do not
              agree, please do not use the site.
            </p>
            <p className="legal-placeholder">
              [PLACEHOLDER — add your business address and the city whose courts will have jurisdiction (see
              section 15).]
            </p>
          </section>

          <section>
            <h2>2. What ARTISAN is — and is not</h2>
            <p>
              ARTISAN is a <strong>marketplace intermediary</strong>. We provide the platform where independent
              artists list their own original work and accept commissions from collectors. We are not the seller,
              creator, or owner of the artwork listed here.
            </p>
            <p>
              Every contract of sale is between the <strong>buyer and the artist</strong>. The artist is solely
              responsible for the authenticity, description, condition, packing, and shipping of their work. We
              verify artists before their listings go live and we operate a dispute process, but we do not
              independently authenticate or inspect individual artworks.
            </p>
          </section>

          <section>
            <h2>3. Your account</h2>
            <ul>
              <li>You must be at least 18 years old to create an account.</li>
              <li>The information you give us must be accurate and kept up to date.</li>
              <li>
                You are responsible for keeping your password and account secure, and for everything done through
                your account.
              </li>
              <li>
                You may sign in with an email and password or with Google. Google Sign-In creates a Collector
                account; to sell, you need an Artist account.
              </li>
              <li>Tell us immediately at <a href="mailto:support@artasin.in">support@artasin.in</a> if you suspect unauthorised access.</li>
            </ul>
          </section>

          <section>
            <h2>4. Terms for artists</h2>

            <h3>Verification</h3>
            <p>
              Every artist account starts as <strong>Pending</strong> verification. You may create listings
              immediately, but they remain in Draft and cannot be published until we approve your studio. We may
              approve, decline, or later revoke verification at our discretion, including where listings appear
              inauthentic, misleading, or in breach of these terms.
            </p>

            <h3>What you promise about your work</h3>
            <ul>
              <li>The work is your own original creation, or you hold all rights needed to sell it.</li>
              <li>
                Your listing is honest — the title, description, medium, dimensions, year, edition, and
                authenticity claims are accurate, and the images shown are of the actual work.
              </li>
              <li>The work is legally yours to sell and is free of any undisclosed lien, claim, or dispute.</li>
              <li>Selling it does not infringe anyone&rsquo;s copyright, trademark, or other rights.</li>
            </ul>

            <h3>Fulfilment</h3>
            <p>
              When an order is paid, you are responsible for packing the work securely and shipping it within a
              reasonable time, and for keeping the order status current in your Studio (Start Fulfilment → Mark
              Shipped → Mark Delivered). Persistent failure to fulfil orders may result in refunds to buyers,
              removal of listings, or account termination.
            </p>

            <h3>Fees and payouts</h3>
            <p>
              ARTISAN charges a commission on each completed sale. The default rate is 15%, and the rate that
              applies to your account is shown on your Studio Dashboard alongside your revenue share. We may change
              commission rates with reasonable notice; the rate in effect at the time of a sale is the rate that
              applies to it.
            </p>
            <p>
              Payouts are the sale price less the platform commission, and are processed to you after the order is
              settled. You are responsible for your own taxes, including GST or income tax, on your earnings.
            </p>

            <h3>Licence you grant us</h3>
            <p>
              You keep full copyright in your artwork. You grant ARTISAN a non-exclusive, royalty-free licence to
              display, reproduce, and distribute images of your listed work and your studio profile for the purpose
              of operating, promoting, and marketing the marketplace. This licence ends when you remove a listing,
              except for copies already used in past marketing or retained in our records.
            </p>
          </section>

          <section>
            <h2>5. Terms for buyers</h2>
            <ul>
              <li>
                Placing an order is an offer to buy. The sale is confirmed once payment is settled and the artist
                begins fulfilment.
              </li>
              <li>
                Prices are shown in the currency listed and exclude shipping, taxes, customs duties, or import
                charges unless stated otherwise. You are responsible for any duties on international shipments.
              </li>
              <li>
                Artwork is unique. Once an order is paid and the artist has begun fulfilment, it cannot generally
                be cancelled — but see the dispute process in section 8.
              </li>
              <li>
                Delivery times depend on the artist and destination. Order status updates and email notifications
                will keep you informed.
              </li>
              <li>
                Buying a physical work does <strong>not</strong> transfer its copyright. You may not reproduce,
                publish, or commercially exploit the work without the artist&rsquo;s separate written permission.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Payments</h2>
            <p>
              Payments are processed by a third-party payment processor. Card details are handled entirely by that
              processor and are never stored on our servers. By placing an order you authorise the charge for the
              order total, including shipping and any applicable taxes or fees shown at checkout.
            </p>
            <p>
              Where an order is settled outside the platform by arrangement, the same obligations in these terms —
              fulfilment, dispute handling, and commission — still apply.
            </p>
            <p>
              We may cancel or refuse an order where we suspect fraud, pricing errors, or a breach of these terms.
            </p>
          </section>

          <section>
            <h2>7. Commissions</h2>
            <p>Custom commissions follow a defined workflow, and each stage has consequences:</p>
            <ul>
              <li>
                <strong>Submitting a brief</strong> costs nothing and creates no obligation on either side. Artists
                are free to decline any request.
              </li>
              <li>
                <strong>A quote</strong> is the artist&rsquo;s proposed price for the described work. Accepting a quote
                and paying creates a binding commission agreement between you and the artist.
              </li>
              <li>
                <strong>Scope</strong> is what was described in the brief and agreed in the messages on that
                commission thread. Substantial changes after work begins may require a revised quote.
              </li>
              <li>
                Because commissioned work is made specifically for you, it is generally{" "}
                <strong>not refundable</strong> once the artist has started, other than through the dispute process
                where work is not delivered or materially differs from what was agreed.
              </li>
              <li>
                Unless separately agreed in writing, the artist retains copyright in commissioned work; you receive
                the physical piece.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. Disputes, refunds, and cancellations</h2>
            <p>
              If something goes wrong with an order, use <strong>Report an Issue</strong> on the order page. This
              flags the order for review and pauses fulfilment. We will look at the order, the messages between
              you, and any evidence either side provides, and then either refund the buyer or resolve the order in
              the artist&rsquo;s favour.
            </p>
            <p>
              Our decision on a dispute is final as far as the platform is concerned. It does not limit any legal
              rights you may have against the other party, or your rights as a consumer under applicable law.
            </p>
          </section>

          <section>
            <h2>9. Reviews</h2>
            <ul>
              <li>Only a buyer with a delivered order can review it, and only once per order.</li>
              <li>Reviews must reflect your genuine experience of that transaction.</li>
              <li>
                You may not buy, sell, exchange, or incentivise reviews, review your own work, or post reviews that
                are abusive, defamatory, or unrelated to the transaction.
              </li>
              <li>
                We may remove reviews that breach these rules, but we do not edit reviews to make them more
                favourable and we do not remove reviews simply because an artist dislikes them.
              </li>
            </ul>
          </section>

          <section>
            <h2>10. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>List counterfeit, stolen, forged, or misattributed work, or anything you do not have the right to sell.</li>
              <li>Upload content that is unlawful, infringing, obscene, hateful, or harassing.</li>
              <li>Impersonate another person, artist, or studio.</li>
              <li>Take transactions off-platform to avoid commission after a connection is made here.</li>
              <li>Scrape, crawl, reverse engineer, overload, or attempt to gain unauthorised access to the site.</li>
              <li>Use the messaging or commission features to send spam or solicit unrelated business.</li>
            </ul>
          </section>

          <section>
            <h2>11. Intellectual property</h2>
            <p>
              Artists retain copyright in their artwork. ARTISAN retains all rights in the site itself — its name,
              branding, design, and software. Nothing in these terms transfers ownership of either to you.
            </p>
            <p>
              If you believe content here infringes your copyright, email{" "}
              <a href="mailto:support@artasin.in">support@artasin.in</a> with details of the work, the infringing
              listing, and your contact information, and we will investigate and remove infringing content where
              appropriate.
            </p>
          </section>

          <section>
            <h2>12. Suspension and termination</h2>
            <p>
              You may close your account at any time by contacting us. We may suspend or terminate an account that
              breaches these terms, engages in fraud, or exposes other users or the platform to risk. Obligations
              that by their nature should survive — including payment for completed orders, fulfilment of paid
              orders, and the licence in section 4 — survive termination.
            </p>
          </section>

          <section>
            <h2>13. Disclaimers</h2>
            <p>
              The site is provided &ldquo;as is&rdquo;. We do not warrant that it will be uninterrupted or
              error-free, and we do not warrant the quality, authenticity, safety, or legality of any artwork
              listed by an artist, nor the truth or accuracy of any listing. Transactions are between buyer and
              artist, and you deal with the other party at your own risk.
            </p>
          </section>

          <section>
            <h2>14. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, ARTISAN is not liable for indirect, incidental,
              consequential, or punitive damages, or for lost profits, data, or goodwill. Our total liability for
              any claim relating to an order is limited to the commission we actually received on that order, and
              our total liability for any other claim is limited to ₹10,000.
            </p>
            <p>
              Nothing here excludes liability that cannot be excluded by law, including for fraud or for your
              rights as a consumer under applicable consumer protection law.
            </p>
          </section>

          <section>
            <h2>15. Governing law</h2>
            <p>
              These terms are governed by the laws of India. Any dispute will be subject to the exclusive
              jurisdiction of the courts at{" "}
              <span className="legal-inline-placeholder">[YOUR CITY, YOUR STATE]</span>, India.
            </p>
          </section>

          <section>
            <h2>16. Changes to these terms</h2>
            <p>
              We may update these terms. The date at the top of this page shows when they last changed, and we will
              notify you of significant changes by email or a notice on the site. Continuing to use ARTISAN after a
              change means you accept the updated terms.
            </p>
          </section>

          <p className="legal-footer-note">
            Questions? Email <a href="mailto:support@artasin.in">support@artasin.in</a>. See also our{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </article>
      </main>
      <Footer variant="simple" />
    </>
  );
}
