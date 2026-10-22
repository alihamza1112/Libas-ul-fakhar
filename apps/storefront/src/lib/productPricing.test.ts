import { test } from "node:test";
import assert from "node:assert/strict";
import { isoToPktLocal, materialize, pktLocalToIso, salePriceForPercent, saleState } from "./productPricing.ts";
import type { Product } from "./types";

const base = { basePrice: 500000, price: 0, createdAt: "2026-01-01T00:00:00.000Z" } as Product;
const t = (iso: string) => Date.parse(iso);

test("sale states across a window", () => {
  const sale = { price: 400000, startsAt: "2026-11-01T05:00:00.000Z", endsAt: "2026-11-05T05:00:00.000Z" };
  assert.equal(saleState(undefined, t("2026-11-02T00:00:00Z")), "none");
  assert.equal(saleState(sale, t("2026-10-31T00:00:00Z")), "scheduled");
  assert.equal(saleState(sale, t("2026-11-01T05:00:00Z")), "live"); // start is inclusive
  assert.equal(saleState(sale, t("2026-11-05T04:59:59Z")), "live");
  assert.equal(saleState(sale, t("2026-11-05T05:00:00Z")), "ended"); // end is exclusive
  assert.equal(saleState({ price: 1 }, t("2030-01-01T00:00:00Z")), "live"); // open-ended
});

test("materialize applies a live sale and reverts after it ends", () => {
  const p = { ...base, sale: { price: 400000, endsAt: "2026-11-05T05:00:00.000Z" } };
  const during = materialize(p, t("2026-11-01T00:00:00Z"));
  assert.equal(during.price, 400000);
  assert.equal(during.compareAt, 500000);
  const after = materialize(p, t("2026-11-06T00:00:00Z"));
  assert.equal(after.price, 500000);
  assert.equal(after.compareAt, undefined);
});

test("a sale price not below the base price is ignored", () => {
  const p = materialize({ ...base, sale: { price: 600000 } }, t("2026-11-01T00:00:00Z"));
  assert.equal(p.price, 500000);
  assert.equal(p.compareAt, undefined);
});

test("isNew within 30 days of creation", () => {
  assert.equal(materialize(base, t("2026-01-20T00:00:00Z")).isNew, true);
  assert.equal(materialize(base, t("2026-03-01T00:00:00Z")).isNew, false);
});

test("percent sale prices end in 90 and stay below base", () => {
  assert.equal(salePriceForPercent(399000, 30), 279000);
  assert.equal(salePriceForPercent(549000, 50), 269000);
  assert.ok(salePriceForPercent(99000, 5) < 99000);
});

test("Karachi time conversion round-trips", () => {
  assert.equal(pktLocalToIso("2026-11-01T10:00"), "2026-11-01T05:00:00.000Z");
  assert.equal(pktLocalToIso("2026-11-01"), "2026-10-31T19:00:00.000Z");
  assert.equal(pktLocalToIso("01/11/2026"), undefined);
  assert.equal(isoToPktLocal("2026-11-01T05:00:00.000Z"), "2026-11-01T10:00");
});
