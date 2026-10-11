import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { orderRequestAdminEmail, orderRequestedBuyerEmail } = await import("./emails.js");

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
