const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

function layout(title, bodyHtml) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #111;">
      <div style="padding: 32px 0 24px; border-bottom: 1px solid #ddd;">
        <span style="font-size: 20px; letter-spacing: 0.08em; text-transform: uppercase;">Artisan</span>
      </div>
      <div style="padding: 32px 0;">
        <h1 style="font-size: 22px; font-weight: normal; margin: 0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding: 24px 0; border-top: 1px solid #ddd; font-family: Arial, sans-serif; font-size: 12px; color: #777;">
        Artisan Exchange &middot; <a href="${siteUrl}" style="color: #777;">${siteUrl.replace(/^https?:\/\//, "")}</a>
      </div>
    </div>
  `;
}

function button(label, href) {
  return `<p><a href="${href}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;">${label}</a></p>`;
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

export function artistVerificationDecisionEmail(status) {
  const approved = status === "APPROVED";
  return {
    subject: approved ? "You're verified on Artisan" : "Update on your artist verification",
    html: layout(
      approved ? "You're Verified" : "Verification Update",
      approved
        ? `<p>Your artist profile has been verified. You can now publish artworks for sale.</p>${button("Go to Studio", `${siteUrl}/studio`)}`
        : `<p>We weren't able to verify your artist profile at this time. Reply to this email if you have questions.</p>`
    )
  };
}
