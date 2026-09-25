const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

/**
 * Resend replaces this when it sends a Broadcast, and handles the unsubscribe
 * itself from there. It is only ever put in marketing mail: a transactional
 * email carrying an unsubscribe link would be offering to stop order
 * confirmations, which is not on offer.
 */
const UNSUBSCRIBE_TAG = "{{{RESEND_UNSUBSCRIBE_URL}}}";

function layout(title, bodyHtml, { unsubscribe = false } = {}) {
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

function button(label, href) {
  return `<p><a href="${href}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;">${label}</a></p>`;
}

// Message bodies are free-form user text, unlike the mostly-short,
// system-shaped fields the other templates below interpolate — worth
// escaping before it lands in HTML sent to someone else's inbox.
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );
}

function money(cents, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100
  );
}

export function orderConfirmedBuyerEmail(order, itemTitle) {
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

export function orderSoldArtistEmail(order, itemTitle, buyerName) {
  return {
    subject: "You made a sale",
    html: layout(
      "You Made a Sale",
      `<p><strong>${buyerName}</strong> just purchased <strong>${itemTitle}</strong> for ${money(order.subtotalCents, order.currency)}.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function orderStatusChangedBuyerEmail(order, itemTitle) {
  const statusLabels = { SHIPPED: "shipped", DELIVERED: "delivered" };
  const label = statusLabels[order.status] || order.status.toLowerCase();
  return {
    subject: `Your order has ${label}`,
    html: layout(
      `Order ${label[0].toUpperCase()}${label.slice(1)}`,
      `<p>Your order for <strong>${itemTitle}</strong> has been marked as ${label}.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function orderRefundedBuyerEmail(order, itemTitle) {
  return {
    subject: "Your order has been refunded",
    html: layout(
      "Order Refunded",
      `<p>Your order for <strong>${itemTitle}</strong> has been refunded following a review of your reported issue.</p>
       ${button("View Order", `${siteUrl}/orders/${order.id}`)}`
    )
  };
}

export function disputeFiledAdminEmail(order) {
  return {
    subject: `Order #${order.id.slice(-8).toUpperCase()} was disputed`,
    html: layout(
      "New Dispute Filed",
      `<p>An order was just flagged for review and needs a decision.</p>
       ${button("Review Disputes", `${siteUrl}/admin/disputes`)}`
    )
  };
}

export function newCommissionRequestArtistEmail(request, buyerName) {
  return {
    subject: "New commission request",
    html: layout(
      "New Commission Request",
      `<p><strong>${buyerName}</strong> sent you a commission request: <strong>${request.title}</strong>.</p>
       ${button("View Request", `${siteUrl}/studio/commissions/${request.id}`)}`
    )
  };
}

export function commissionQuotedBuyerEmail(request) {
  return {
    subject: "You received a commission quote",
    html: layout(
      "Commission Quoted",
      `<p>You've received a quote of ${money(request.quotedPriceCents, request.currency)} for <strong>${request.title}</strong>.</p>
       ${button("View Request", `${siteUrl}/commissions/${request.id}`)}`
    )
  };
}

export function commissionRejectedBuyerEmail(request) {
  return {
    subject: "Update on your commission request",
    html: layout(
      "Commission Request Declined",
      `<p>The artist wasn't able to take on your request, <strong>${request.title}</strong>, at this time.</p>
       ${button("Browse Other Artists", `${siteUrl}/gallery`)}`
    )
  };
}

export function newCommissionMessageEmail(request, senderName, messageBody, threadUrl) {
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
export function newBlogPostEmail(post, artistName) {
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

export function passwordResetEmail(token, expiryMinutes) {
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

export function artistUploadReminderEmail(artistName) {
  return {
    subject: "Keep your Artasin profile fresh",
    html: layout(
      "Your Art Deserves To Be Seen",
      `<p>Hi ${escapeHtml(artistName)},</p>
       <p>Collectors are actively browsing Artasin and discovering new artists every day. Make sure your latest work is part of that discovery.</p>
       <p>A few ways to stay visible:</p>
       <ul style="padding-left: 20px; margin: 0 0 16px;">
         <li>Add your latest artwork</li>
         <li>Update your profile and bio</li>
         <li>Showcase your best work</li>
         <li>Keep creating, and keep your profile fresh</li>
       </ul>
       <p>Don't let your next great piece go unseen — put it in front of people who are looking for art like yours.</p>
       ${button("Upload New Artwork", `${siteUrl}/studio/artworks/new`)}`
    )
  };
}

export function artistVerificationDecisionEmail(status) {
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
export function phoneNumberReminderEmail(firstName, isArtist) {
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
