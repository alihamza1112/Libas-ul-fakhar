import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, formatPKR, FREE_SHIPPING_THRESHOLD, SHIPPING_MAJOR, SHIPPING_OTHER } from "./pricing.ts";

test("formats PKR as Rs. 2,499", () => {
  assert.equal(formatPKR(249900), "Rs. 2,499");
  assert.equal(formatPKR(0), "Rs. 0");
});

test("empty cart costs nothing", () => {
  assert.deepEqual(computeTotals([]), { subtotal: 0, discount: 0, shipping: 0, total: 0, couponApplied: undefined, couponError: undefined });
});

test("shipping by city, free above threshold", () => {
  assert.equal(computeTotals([{ unitPrice: 100000, qty: 1 }], { city: "Lahore" }).shipping, SHIPPING_MAJOR);
  assert.equal(computeTotals([{ unitPrice: 100000, qty: 1 }], { city: "Sukkur" }).shipping, SHIPPING_OTHER);
  assert.equal(computeTotals([{ unitPrice: FREE_SHIPPING_THRESHOLD, qty: 1 }], { city: "Sukkur" }).shipping, 0);
});

test("percent coupon is capped", () => {
  const t = computeTotals([{ unitPrice: 2000000, qty: 1 }], { coupon: "welcome10" });
  assert.equal(t.couponApplied, "WELCOME10");
  assert.equal(t.discount, 100000);
  assert.equal(t.total, 1900000);
});

test("coupon minimum is enforced", () => {
  const t = computeTotals([{ unitPrice: 300000, qty: 1 }], { coupon: "FAKHAR500" });
  assert.equal(t.discount, 0);
  assert.match(t.couponError ?? "", /Add Rs\. 2,000 more/);
});

test("discount that drops below free-shipping threshold re-adds shipping", () => {
  const t = computeTotals([{ unitPrice: 520000, qty: 1 }], { coupon: "FAKHAR500", city: "Karachi" });
  assert.equal(t.discount, 50000);
  assert.equal(t.shipping, SHIPPING_MAJOR);
  assert.equal(t.total, 470000 + SHIPPING_MAJOR);
});

test("free shipping coupon and invalid code", () => {
  assert.equal(computeTotals([{ unitPrice: 100000, qty: 2 }], { coupon: "FREESHIP", city: "Quetta" }).shipping, 0);
  assert.equal(computeTotals([{ unitPrice: 100000, qty: 1 }], { coupon: "NOPE" }).couponError, "This code is not valid.");
});

test("quantities are floored and never negative", () => {
  assert.equal(computeTotals([{ unitPrice: 100000, qty: -3 }, { unitPrice: 100000, qty: 1.7 }]).subtotal, 100000);
});
