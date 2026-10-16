import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  commissionQuotedBuyerEmail,
  commissionRejectedBuyerEmail,
  newCommissionRequestArtistEmail,
  orderConfirmedBuyerEmail,
  orderRefundedBuyerEmail,
  orderRequestAdminEmail,
  orderRequestedBuyerEmail,
  orderSoldArtistEmail,
  orderStatusChangedBuyerEmail
} from "./emails";

const buyer = { firstName: "Mira", lastName: "Shah", email: "mira@example.org", phone: "+919876543210" };
const address = {
  fullName: "Mira Shah",
  addressLine1: "12 <b>Hill</b> Road",
  city: "Pune",
  state: "MH",
  postalCode: "411001",
  country: "India"
};
const item = {
  orderId: "ord_1",
  title: "Blue Birds",
  artistName: "Padmaja Pimple",
  artistEmail: "padmaja@example.org",
  artistPhone: "+919000000001",
  priceCents: 750000,
  shippingCents: 0,
  taxCents: 0,
  buyerServiceFeeCents: 0,
  currency: "INR",
  commissionCents: 112500,
  payoutCents: 637500,
  otherOpenOrders: 0
};

describe("orderRequestAdminEmail", () => {
  it("carries everything needed to contact the buyer and take payment", () => {
    const { subject, html } = orderRequestAdminEmail(buyer, address, [item]);
    assert.match(subject, /Blue Birds/);
    assert.match(subject, /7,500/);
    for (const part of ["mira@example.org", "+919876543210", "Pune, MH, 411001", "Padmaja Pimple", "ord_1", "Payment has not been taken"]) {
      assert.ok(html.includes(part), part);
    }
  });

  it("escapes what the buyer typed", () => {
    const { html } = orderRequestAdminEmail(buyer, address, [item]);
    assert.ok(!html.includes("<b>Hill</b>"));
    assert.ok(html.includes("&lt;b&gt;Hill&lt;/b&gt;"));
  });

  it("warns when another order is open for the same piece", () => {
    const { html } = orderRequestAdminEmail(buyer, address, [{ ...item, otherOpenOrders: 1 }]);
    assert.match(html, /1 other open order for this piece/);
  });

  it("totals several pieces", () => {
    const { subject } = orderRequestAdminEmail(buyer, address, [item, { ...item, orderId: "ord_2" }]);
    assert.match(subject, /2 pieces/);
    assert.match(subject, /15,000/);
  });
});

describe("orderRequestedBuyerEmail", () => {
  it("says they'll be contacted and that nothing has been charged", () => {
    const { subject, html } = orderRequestedBuyerEmail(buyer, [item]);
    assert.equal(subject, "We've received your order");
    assert.match(html, /will contact you shortly/);
    assert.match(html, /Nothing has been charged yet/);
    assert.ok(html.includes("+919876543210"));
  });
});

describe("user-controlled text in transactional emails", () => {
  const evil = "<b>x</b>";
  const escaped = "&lt;b&gt;x&lt;/b&gt;";
  const order = {
    id: "ord_1",
    status: "SHIPPED" as const,
    currency: "INR",
    subtotalCents: 750000,
    shippingCents: 0,
    taxCents: 0,
    buyerServiceFeeCents: 0
  };
  const request = { id: "req_1", title: evil, quotedPriceCents: 500000, currency: "INR" };

  const cases: Record<string, () => { html: string }> = {
    orderConfirmedBuyerEmail: () => orderConfirmedBuyerEmail(order, evil),
    orderSoldArtistEmail: () => orderSoldArtistEmail(order, evil, "Mira"),
    orderSoldArtistEmail_buyerName: () => orderSoldArtistEmail(order, "Blue Birds", evil),
    orderStatusChangedBuyerEmail: () => orderStatusChangedBuyerEmail(order, evil),
    orderRefundedBuyerEmail: () => orderRefundedBuyerEmail(order, evil),
    newCommissionRequestArtistEmail_title: () => newCommissionRequestArtistEmail(request, "Mira"),
    newCommissionRequestArtistEmail_buyerName: () =>
      newCommissionRequestArtistEmail({ ...request, title: "Portrait" }, evil),
    commissionQuotedBuyerEmail: () => commissionQuotedBuyerEmail(request),
    commissionRejectedBuyerEmail: () => commissionRejectedBuyerEmail(request)
  };

  for (const [name, build] of Object.entries(cases)) {
    it(`${name} escapes HTML in the body`, () => {
      const { html } = build();
      assert.ok(!html.includes(evil), "raw markup reached the HTML");
      assert.ok(html.includes(escaped), "escaped text is missing");
    });
  }

  it("leaves ordinary text unchanged", () => {
    const { html } = orderConfirmedBuyerEmail(order, "Blue Birds");
    assert.ok(html.includes("<strong>Blue Birds</strong>"));
    const quote = newCommissionRequestArtistEmail({ ...request, title: "Portrait of Mira" }, "Mira Shah");
    assert.ok(quote.html.includes("<strong>Mira Shah</strong> sent you a commission request: <strong>Portrait of Mira</strong>."));
  });

  it("keeps subjects as plain text", () => {
    const { subject } = orderConfirmedBuyerEmail(order, evil);
    assert.equal(subject, "Your order is confirmed");
  });
});
