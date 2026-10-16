import type { BlogPost, CommissionRequest, Order, OrderStatus, User, VerificationStatus } from "@prisma/client";
import type { EmailContent } from "@/lib/email";
import type { ShippingAddress } from "@/types/orders";
import type { NonEmptyArray } from "@/types/utils";

type OrderTotals = Pick<Order, "id" | "subtotalCents" | "shippingCents" | "taxCents" | "buyerServiceFeeCents" | "currency">;

/** A buyer as the order-request emails need them. */
export type OrderRequestBuyer = Pick<User, "firstName" | "lastName" | "email" | "phone">;

/** One piece in an order request, flattened for the emails. */
export interface OrderRequestItem {
  orderId: string;
  title: string;
  artistName: string;
  artistEmail?: string | null;
  artistPhone?: string | null;
  priceCents: number;
  shippingCents?: number;
  taxCents?: number;
  buyerServiceFeeCents?: number;
  currency: string;
  commissionCents: number;
  payoutCents: number;
  otherOpenOrders: number;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

/**
 * Resend replaces this when it sends a Broadcast, and handles the unsubscribe
 * itself from there. It is only ever put in marketing mail: a transactional
 * email carrying an unsubscribe link would be offering to stop order
 * confirmations, which is not on offer.
 */
const UNSUBSCRIBE_TAG = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function layout(title: string, bodyHtml: string, { unsubscribe = false }: { unsubscribe?: boolean } = {}): string {
  const unsubscribeHtml = unsubscribe
    ? `<br />You are receiving this because you asked for studio news.
       <a href="${UNSUBSCRIBE_TAG}" style="color: #777;">Unsubscribe</a>.
       Order and account emails are not affected.`
    : "";
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #111;">
      <div style="padding: 32px 0 24px; border-bottom: 1px solid #ddd;">
        <span style="font-size: 20px; letter-spacing: 0.08em; text-transform: uppercase;">Artasin</span>
      </div>
      <div style="padding: 32px 0;">
        <h1 style="font-size: 22px; font-weight: normal; margin: 0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding: 24px 0; border-top: 1px solid #ddd; font-family: Arial, sans-serif; font-size: 12px; color: #777;">
        Artasin &middot; <a href="${siteUrl}" style="color: #777;">${siteUrl.replace(/^https?:\/\//, "")}</a>
        ${unsubscribeHtml}
      </div>
    </div>
  `;
}

function button(label: string, href: string): string {
  return `<p><a href="${href}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;">${label}</a></p>`;
}

// Message bodies are free-form user text, unlike the mostly-short,
// system-shaped fields the other templates below interpolate — worth
// escaping before it lands in HTML sent to someone else's inbox.
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

function money(cents: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

export function orderConfirmedBuyerEmail(order: OrderTotals, itemTitle: string): EmailContent {
  const totalCents = order.subtotalCents + order.shippingCents + order.taxCents + order.buyerServiceFeeCents;
  return {
    subject: "Your order is confirmed",
    html: layout(
      "Order Confirmed",
      `<p>Thank you for your purchase. Your order for <strong>${itemTitle}</strong> is confirmed at ${money(totalCents, order.currency)}.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function orderSoldArtistEmail(order: Pick<Order, "id" | "subtotalCents" | "currency">, itemTitle: string, buyerName: string): EmailContent {
  return {
    subject: "You made a sale",
    html: layout(
      "You Made a Sale",
      `<p><strong>${buyerName}</strong> just purchased <strong>${itemTitle}</strong> for ${money(order.subtotalCents, order.currency)}.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

function safe(value: unknown): string {
  return escapeHtml(String(value ?? ""));
}

function orderTotalCents(item: OrderRequestItem): number {
  return item.priceCents + (item.shippingCents || 0) + (item.taxCents || 0) + (item.buyerServiceFeeCents || 0);
}

function itemsTable(items: NonEmptyArray<OrderRequestItem>, withDetails: boolean): string {
  const rows = items
    .map((item) => {
      const extra = withDetails
        ? `<br /><span style="color: #555; font-size: 13px;">Artist: ${safe(item.artistName)}${
            item.artistEmail ? ` &middot; ${safe(item.artistEmail)}` : ""
          }${item.artistPhone ? ` &middot; ${safe(item.artistPhone)}` : ""}<br />
            Artist share ${money(item.payoutCents, item.currency)}, Artasin commission ${money(item.commissionCents, item.currency)}<br />
            Order ${safe(item.orderId)}${
              item.otherOpenOrders
                ? `<br /><strong style="color: #b00020;">${item.otherOpenOrders} other open order${
                    item.otherOpenOrders === 1 ? "" : "s"
                  } for this piece. Only one buyer can have it.</strong>`
                : ""
            }</span>`
        : "";
      return `<tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-family: Georgia, serif;">${safe(item.title)}${extra}</td>
        <td style="padding: 8px 0 8px 16px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">${money(orderTotalCents(item), item.currency)}</td>
      </tr>`;
    })
    .join("");
  const total = items.reduce((sum, item) => sum + orderTotalCents(item), 0);
  return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${rows}
    <tr><td style="padding-top: 12px;"><strong>Total</strong></td><td style="padding-top: 12px; text-align: right;"><strong>${money(total, items[0].currency)}</strong></td></tr>
  </table>`;
}

/**
 * Sent when payment is taken directly by the Artasin team (PAYMENT_PROVIDER
 * offline): nothing has been charged, and the team will be in touch.
 */
export function orderRequestedBuyerEmail(buyer: OrderRequestBuyer, items: NonEmptyArray<OrderRequestItem>): EmailContent {
  const phone = buyer.phone ? ` or on ${safe(buyer.phone)}` : "";
  const what = items.length === 1 ? `<strong>${safe(items[0].title)}</strong>` : `${items.length} pieces`;
  return {
    subject: "We've received your order",
    html: layout(
      "Thank You For Your Order",
      `<p>Hi ${safe(buyer.firstName)},</p>
       <p>We've received your order for ${what}. The Artasin team will contact you shortly at ${safe(buyer.email)}${phone} to arrange payment and delivery.</p>
       <p><strong>Nothing has been charged yet</strong>, and you don't need to do anything until we've been in touch.</p>
       ${itemsTable(items, false)}
       ${button("View Your Order", `${siteUrl}/orders/${items[0].orderId}`)}`
    )
  };
}

/** Everything the team needs to contact the buyer and take payment. */
export function orderRequestAdminEmail(
  buyer: OrderRequestBuyer,
  address: ShippingAddress | null | undefined,
  items: NonEmptyArray<OrderRequestItem>
): EmailContent {
  const a = address || {};
  const lines = [a.fullName, a.addressLine1, a.addressLine2, [a.city, a.state, a.postalCode].filter(Boolean).join(", "), a.country]
    .filter(Boolean)
    .map(safe)
    .join("<br />");
  const total = items.reduce((sum, item) => sum + orderTotalCents(item), 0);
  const title = items.length === 1 ? items[0].title : `${items.length} pieces`;
  return {
    subject: `New order: ${title} (${money(total, items[0].currency)})`,
    html: layout(
      "New Order",
      `<p><strong>${safe(buyer.firstName)} ${safe(buyer.lastName)}</strong> has placed an order. <strong>Payment has not been taken.</strong> Contact them to arrange it, then mark the order as paid.</p>
       <p style="margin: 16px 0 4px;"><strong>Buyer</strong></p>
       <p style="margin: 0;">${safe(buyer.email)}${buyer.phone ? `<br />${safe(buyer.phone)}` : ""}${
         a.email && a.email !== buyer.email ? `<br />Order email: ${safe(a.email)}` : ""
       }</p>
       <p style="margin: 16px 0 4px;"><strong>Ship to</strong></p>
       <p style="margin: 0;">${lines || "No address given"}</p>
       <p style="margin: 16px 0 0;"><strong>Items</strong></p>
       ${itemsTable(items, true)}
       ${button("Open Order Requests", `${siteUrl}/admin/orders`)}`
    )
  };
}

export function orderStatusChangedBuyerEmail(order: Pick<Order, "id" | "status">, itemTitle: string): EmailContent {
  const statusLabels: Partial<Record<OrderStatus, string>> = { SHIPPED: "shipped", DELIVERED: "delivered" };
  const label = statusLabels[order.status] || order.status.toLowerCase();
  return {
    subject: `Your order has ${label}`,
    html: layout(
      `Order ${label.charAt(0).toUpperCase()}${label.slice(1)}`,
      `<p>Your order for <strong>${itemTitle}</strong> has been marked as ${label}.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function orderRefundedBuyerEmail(order: Pick<Order, "id">, itemTitle: string): EmailContent {
  return {
    subject: "Your order has been refunded",
    html: layout(
      "Order Refunded",
      `<p>Your order for <strong>${itemTitle}</strong> has been refunded following a review of your reported issue.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function disputeFiledAdminEmail(order: Pick<Order, "id">): EmailContent {
  return {
    subject: `Order #${order.id.slice(-8).toUpperCase()} was disputed`,
    html: layout(
      "New Dispute Filed",
      `<p>An order was just flagged for review and needs a decision.</p>
       ${button("Review Disputes", `${siteUrl}/admin/disputes`)}`
    )
  };
}

export function newCommissionRequestArtistEmail(request: Pick<CommissionRequest, "id" | "title">, buyerName: string): EmailContent {
  return {
    subject: "New commission request",
    html: layout(
      "New Commission Request",
      `<p><strong>${buyerName}</strong> sent you a commission request: <strong>${request.title}</strong>.</p>
       ${button("View Request", `${siteUrl}/studio/commissions/${request.id}`)}`
    )
  };
}

export function commissionQuotedBuyerEmail(
  request: Pick<CommissionRequest, "id" | "title"> & { quotedPriceCents: number; currency: string }
): EmailContent {
  return {
    subject: "You received a commission quote",
    html: layout(
      "Commission Quoted",
      `<p>You've received a quote of ${money(request.quotedPriceCents, request.currency)} for <strong>${request.title}</strong>.</p>
       ${button("View Request", `${siteUrl}/commissions/${request.id}`)}`
    )
  };
}

export function commissionRejectedBuyerEmail(request: Pick<CommissionRequest, "id" | "title">): EmailContent {
  return {
    subject: "Update on your commission request",
    html: layout(
      "Commission Request Declined",
      `<p>The artist wasn't able to take on your request, <strong>${request.title}</strong>, at this time.</p>
       ${button("Browse Other Artists", `${siteUrl}/gallery`)}`
    )
  };
}

export function newCommissionMessageEmail(
  request: Pick<CommissionRequest, "title">,
  senderName: string,
  messageBody: string,
  threadUrl: string
): EmailContent {
  const truncated = messageBody.length > 240 ? `${messageBody.slice(0, 240)}…` : messageBody;
  const preview = escapeHtml(truncated);
  return {
    subject: `New message from ${senderName}`,
    html: layout(
      "New Message",
      `<p><strong>${escapeHtml(senderName)}</strong> sent you a message about <strong>${escapeHtml(request.title)}</strong>:</p>
       <p style="padding: 16px; background: #f5f5f3; border-left: 2px solid #111; font-style: italic;">${preview}</p>
       ${button("Reply", threadUrl)}`
    )
  };
}

/**
 * The one template that goes out as a Broadcast rather than to a named
 * recipient, so it is the one that carries an unsubscribe link and the only
 * one that can use Resend's merge tags — nothing else knows the reader's name
 * at the point the body is built.
 */
export function newBlogPostEmail(post: Pick<BlogPost, "title" | "slug" | "excerpt">, artistName: string): EmailContent {
  const excerptHtml = post.excerpt
    ? `<p>${escapeHtml(post.excerpt)}</p>`
    : "";
  return {
    subject: `New from ${artistName}: ${post.title}`,
    html: layout(
      "New Journal Post",
      `<p>Hello {{{contact.first_name|there}}},</p>
       <p><strong>${escapeHtml(artistName)}</strong> just published a new post.</p>
       <h2 style="font-size: 18px; font-weight: normal; margin: 24px 0 8px;">${escapeHtml(post.title)}</h2>
       ${excerptHtml}
       ${button("Read Post", `${siteUrl}/blog/${post.slug}`)}`,
      { unsubscribe: true }
    )
  };
}

/**
 * Sent once to someone subscribed by default rather than by ticking a box,
 * so they hear about it from us before the first update arrives, with a way
 * out that takes one click.
 */
export function newsletterNoticeEmail(firstName: string, unsubscribeHref: string): EmailContent {
  return {
    subject: "You're on the Artasin list",
    html: layout(
      "You're On The List",
      `<p>Hi ${escapeHtml(firstName || "there")},</p>
       <p>We've added you to Artasin updates: new work from our artists, Journal posts, and news from the studios. We only write when there is something worth seeing.</p>
       <p>If you'd rather not hear from us, unsubscribing takes one click. It doesn't affect emails about your orders, commissions or account.</p>
       ${button("Unsubscribe", unsubscribeHref)}
       <p style="font-family: Arial, sans-serif; font-size: 12px; color: #777; margin-top: 24px;">
         You can also change this any time under Account &rarr; Email preferences.
       </p>`
    )
  };
}

export function blogPostSubmittedAdminEmail(post: Pick<BlogPost, "id" | "title">, artistName: string): EmailContent {
  return {
    subject: `Journal post to review: ${post.title}`,
    html: layout(
      "A Journal Post Is Waiting",
      `<p><strong>${escapeHtml(artistName)}</strong> submitted a post for the Journal. It stays off the site until it is approved.</p>
       <h2 style="font-size: 18px; font-weight: normal; margin: 24px 0 8px;">${escapeHtml(post.title)}</h2>
       ${button("Review Post", `${siteUrl}/admin/blog/${post.id}`)}`
    )
  };
}

export function blogPostDecisionEmail(
  post: Pick<BlogPost, "id" | "title" | "slug">,
  approved: boolean,
  note: string | null | undefined
): EmailContent {
  const noteHtml = note
    ? `<p style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #ddd; color: #444;">${escapeHtml(note)}</p>`
    : "";
  return approved
    ? {
        subject: `Your post is live: ${post.title}`,
        html: layout(
          "Your Post Is Live",
          `<p>Your Journal post <strong>${escapeHtml(post.title)}</strong> has been approved and is now on Artasin.</p>
           ${button("View Post", `${siteUrl}/blog/${post.slug}`)}`
        )
      }
    : {
        subject: `Your post needs changes: ${post.title}`,
        html: layout(
          "Your Post Was Not Approved",
          `<p>Your Journal post <strong>${escapeHtml(post.title)}</strong> was not approved, so it is not on the site.</p>
           ${noteHtml}
           <p>The Journal is for stories about your work and process. Listings for sale belong in your studio, where collectors can buy them. You can edit the post and submit it again.</p>
           ${button("Edit Post", `${siteUrl}/studio/blog/${post.id}/edit`)}`
        )
      };
}

export function passwordResetEmail(token: string, expiryMinutes: number): EmailContent {
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;
  return {
    subject: "Reset your ARTASIN password",
    html: layout(
      "Reset Your Password",
      `<p>We received a request to reset the password on your ARTASIN account. This link expires in ${expiryMinutes} minutes and can only be used once.</p>
       ${button("Reset Password", resetUrl)}
       <p style="font-family: Arial, sans-serif; font-size: 12px; color: #777; margin-top: 24px;">
         If you didn't request this, you can safely ignore this email — your password won't change.
       </p>`
    )
  };
}

/**
 * For approved artists whose studio is still empty. Until they list something
 * they appear nowhere collectors browse, so the email is about that one step
 * and links straight to the listing form.
 */
export function firstListingReminderEmail(firstName: string): EmailContent {
  return {
    subject: "Your Artasin studio is ready for its first piece",
    html: layout(
      "Show Collectors Your Work",
      `<p>Hi ${escapeHtml(firstName)},</p>
       <p>Your studio on Artasin is set up and approved, but there's no work listed in it yet, so collectors browsing the gallery can't find you.</p>
       <p>Listing a piece takes a few minutes: a photo, a title, the size and your price. As soon as it's live it appears in the gallery, on your artist page and in Just Listed on the homepage.</p>
       <p>A few things that help a listing get noticed:</p>
       <ul style="padding-left: 20px; margin: 0 0 16px;">
         <li>Photograph the whole piece in daylight, straight on, with nothing else in the frame</li>
         <li>Add a line or two about what inspired it and how it was made</li>
         <li>List a few pieces rather than one, so people get a feel for your work</li>
       </ul>
       ${button("List Your First Work", `${siteUrl}/studio/artworks/new`)}
       <p style="margin-top: 24px;">Stuck on anything? Write to us at <a href="mailto:support@artasin.in">support@artasin.in</a> and we'll help.</p>`
    )
  };
}

export function artistVerificationDecisionEmail(status: VerificationStatus): EmailContent {
  const approved = status === "APPROVED";
  return {
    subject: approved ? "You're verified on Artasin" : "Update on your artist verification",
    html: layout(
      approved ? "You're Verified" : "Verification Update",
      approved
        ? `<p>Your artist profile has been verified. You can now publish artworks for sale.</p>${button("Go to Studio", `${siteUrl}/studio`)}`
        : `<p>We weren't able to verify your artist profile at this time. Reply to this email if you have questions.</p>`
    )
  };
}

/**
 * Sent to people who signed up before the phone field existed, or who skipped
 * it. The reason differs by role: artists care about incoming work, collectors
 * about the order they placed.
 */
export function phoneNumberReminderEmail(firstName: string, isArtist: boolean): EmailContent {
  const reason = isArtist
    ? "We're setting up notifications so you hear about new custom requests and sales as they happen, rather than waiting on email."
    : "We're setting up notifications so you hear about your order updates as they happen, rather than waiting on email.";

  return {
    subject: "Add your phone number to your Artasin profile",
    html: layout(
      "Add Your Phone Number",
      `<p>Hi ${escapeHtml(firstName)},</p>
       <p>${reason}</p>
       <p>To switch them on, add your phone number to your profile — it takes a moment.</p>
       <p>While you're there you can also choose to get those updates on WhatsApp. That part is entirely optional: leave the box unticked and nothing changes.</p>
       ${button("Add Your Number", `${siteUrl}/account`)}`
    )
  };
}
