import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { RETURN_DAYS } from "@/lib/policies";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Returns and Refunds",
  description: `Return any artwork bought on ARTASIN within ${RETURN_DAYS} days of delivery. Return shipping is free and you get a full refund to your original payment method.`,
  path: "/returns"
});

const LAST_UPDATED = "1 November 2026";

/**
 * The return policy on its own page, for buyers and for Google Merchant
 * Center, which checks that its return settings match a policy page: a
 * {RETURN_DAYS}-day window, any reason, free return shipping by courier only,
 * a full refund to the original payment method, no exchanges. The terms
 * (app/terms, "Delivery and returns") and each artwork page's structured
 * data say the same; change all three together.
 */
export default function ReturnsPolicyPage() {
  return (
    <>
      <Nav />
      <main className="page legal-page">
        <header className="request-header">
          <p className="byline">Legal</p>
          <h1>Returns and Refunds</h1>
          <p>Last updated: {LAST_UPDATED}</p>
        </header>

        <article className="legal-body">
          <section>
            <h2>At a glance</h2>
            <ul>
              <li>
                Return any artwork bought from a listing within <strong>{RETURN_DAYS} days of delivery</strong>,
                for any reason.
              </li>
              <li>
                <strong>Return shipping is free.</strong> We arrange a courier to collect the work from you and
                pay for it.
              </li>
              <li>
                You get a <strong>full refund to your original payment method</strong> once the work is back at
                the artist’s studio and has been checked.
              </li>
              <li>Returns go back by courier only.</li>
              <li>We don’t offer exchanges: every work on ARTASIN is one of a kind.</li>
            </ul>
          </section>

          <section>
            <h2>1. What you can return</h2>
            <p>
              Any artwork you bought from a listing on <strong>artasin.in</strong> and had delivered in India can
              be returned within {RETURN_DAYS} days of the day it was delivered. You don’t need a reason:
              you can return a work you simply don’t want to keep, not only one that arrived damaged.
            </p>
            <p>
              Commissioned work is made specifically for you, so it is covered by the commissions section of our{" "}
              <Link href="/terms">Terms of Service</Link> rather than by this policy.
            </p>
          </section>

          <section>
            <h2>2. How to start a return</h2>
            <p>
              Within {RETURN_DAYS} days of delivery, open the order in <Link href="/orders">your orders</Link> and
              choose <strong>Report an Issue</strong>, or email{" "}
              <a href="mailto:support@artasin.in">support@artasin.in</a> with your order number. If the work arrived
              damaged, add a few photos of the work and its packing.
            </p>
            <p>
              We will confirm the return and book a courier pickup from your delivery address, at no cost to you.
              Returns are collected by courier only; we can’t accept works dropped off in person.
            </p>
          </section>

          <section>
            <h2>3. Packing the work</h2>
            <ul>
              <li>The work must come back in the condition it arrived in.</li>
              <li>
                Please use its original packing where possible. If that isn’t possible, tell us and we will
                advise how to pack it safely.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Your refund</h2>
            <p>
              Once the work is back at its origin, the artist’s studio, and has been checked, we refund the{" "}
              <strong>full price you paid</strong> to your <strong>original payment method</strong>. Your bank or
              card issuer may take a few working days to show it.
            </p>
          </section>

          <section>
            <h2>5. Exchanges</h2>
            <p>
              Every work on ARTASIN is an original, so we can’t exchange one for another. You are welcome to
              return a work for a refund and buy a different one, or{" "}
              <Link href="/requests">commission a piece</Link> made for you.
            </p>
          </section>

          <section>
            <h2>6. Questions</h2>
            <p>
              Email <a href="mailto:support@artasin.in">support@artasin.in</a>. This policy is part of our{" "}
              <Link href="/terms">Terms of Service</Link> and does not limit your rights as a consumer under
              Indian law.
            </p>
          </section>
        </article>
      </main>
      <Footer variant="simple" />
    </>
  );
}
