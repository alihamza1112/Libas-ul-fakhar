import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_PRODUCTS } from "./catalog.ts";
import { bundleSku, bundleTakes, discountedBundlePrice, resolveBundles, validateBundle } from "./bundles.ts";
import { validateProduct, toInput, type ProductInput } from "./productInput.ts";
import { planImport, productsToCsv } from "./productCsv.ts";
import type { Product } from "./types";

const NOW = "2026-10-29T00:00:00.000Z";
const shawl = SEED_PRODUCTS.find((p) => p.garment === "shawl" && !p.preOrder)!;
const cap = SEED_PRODUCTS.find((p) => p.garment === "cap")!;
const kurta = SEED_PRODUCTS.find((p) => p.garment === "kurta" && !p.preOrder)!;
const items = [
  { productId: shawl.id, sku: shawl.variants[0].sku, qty: 1 },
  { productId: cap.id, sku: cap.variants[0].sku, qty: 2 },
  { productId: kurta.id, sku: kurta.variants[2].sku, qty: 1 },
];

const boxInput = (bundle: ProductInput["bundle"], basePrice: number | string = 9990): ProductInput => ({
  name: "Eid Tohfa Box",
  status: "active",
  department: "gifts",
  category: "gift-box",
  garment: "giftbox",
  basePrice,
  fabric: "",
  fit: "",
  description: "A ready-to-give Eid box with a shawl, caps and a kurta.",
  care: "",
  tags: "eid, gift",
  colours: [],
  sizes: [],
  variants: [],
  bundle,
});

test("validateBundle checks items exist, aren't duplicated, and counts", () => {
  assert.equal(validateBundle({ items: items.slice(0, 1) }, SEED_PRODUCTS).ok, false);
  const dup = validateBundle({ items: [items[0], items[0]] }, SEED_PRODUCTS);
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.match(dup.error, /twice/);
  const missing = validateBundle({ items: [items[0], { productId: "p999", sku: "X", qty: 1 }] }, SEED_PRODUCTS);
  assert.equal(missing.ok, false);
  const ok = validateBundle({ items, mode: "discount", percent: 15 }, SEED_PRODUCTS);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.bundle.pricing, { mode: "discount", percent: 15 });
    assert.equal(ok.regularValue, shawl.basePrice + cap.basePrice * 2 + kurta.basePrice);
  }
});

test("a gift box product: fixed price, one Gift box / One Size variant", () => {
  const r = validateProduct(boxInput({ items, mode: "fixed" }), SEED_PRODUCTS, undefined, NOW, "p900");
  assert.ok(r.ok, JSON.stringify(!r.ok && r.errors));
  if (!r.ok) return;
  assert.equal(r.product.basePrice, 999000);
  assert.equal(r.product.group, "Gifts");
  assert.deepEqual(r.product.variants, [{ sku: bundleSku("p900"), size: "One Size", colour: "Gift box", stock: 0 }]);
  assert.equal(r.product.bundle?.items.length, 3);
  assert.equal(r.product.fabric, "Assorted");
});

test("discount-mode box price comes from the items, and refuses a sale price", () => {
  const r = validateProduct(boxInput({ items, mode: "discount", percent: 20 }, ""), SEED_PRODUCTS, undefined, NOW, "p900");
  assert.ok(r.ok, JSON.stringify(!r.ok && r.errors));
  if (r.ok) assert.equal(r.product.basePrice, discountedBundlePrice(shawl.basePrice + cap.basePrice * 2 + kurta.basePrice, 20));
  const withSale = validateProduct({ ...boxInput({ items, mode: "discount", percent: 20 }), salePrice: 5000 }, SEED_PRODUCTS, undefined, NOW, "p900");
  assert.equal(withSale.ok, false);
});

test("a box without contents is rejected", () => {
  const r = validateProduct(boxInput(undefined), SEED_PRODUCTS, undefined, NOW, "p900");
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.bundle);
});

function catalogWithBox(pricing: "fixed" | "discount"): Product[] {
  const r = validateProduct(boxInput({ items, mode: pricing, percent: 10 }), SEED_PRODUCTS, undefined, NOW, "p900");
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return [...SEED_PRODUCTS, r.product];
}

test("box stock is limited by its scarcest item (qty-aware)", () => {
  const all = catalogWithBox("fixed").map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v })) }));
  all.find((p) => p.id === shawl.id)!.variants[0].stock = 7;
  all.find((p) => p.id === cap.id)!.variants[0].stock = 5; // 2 per box -> 2 boxes
  all.find((p) => p.id === kurta.id)!.variants[2].stock = 9;
  const box = resolveBundles(all).find((p) => p.id === "p900")!;
  assert.equal(box.variants[0].stock, 2);
  assert.equal(box.bundleContents?.length, 3);
  assert.equal(box.bundleContents?.[1].qty, 2);
  assert.equal(box.bundleValue, shawl.price + cap.price * 2 + kurta.price);
  assert.equal(box.price, 999000);
});

test("an inactive or deleted item makes the box unavailable", () => {
  const all = catalogWithBox("fixed").map((p) => (p.id === cap.id ? { ...p, status: "draft" as const } : p));
  const box = resolveBundles(all).find((p) => p.id === "p900")!;
  assert.equal(box.variants[0].stock, 0);
  assert.equal(box.bundleContents?.find((c) => c.productId === cap.id)?.available, false);
});

test("discount-mode price follows the items' current prices", () => {
  const all = catalogWithBox("discount");
  const box = resolveBundles(all).find((p) => p.id === "p900")!;
  assert.equal(box.price, discountedBundlePrice(box.bundleValue!, 10));
  assert.equal(box.compareAt, undefined); // a box isn't "on sale" just because it's a bundle
});

test("bundleTakes multiplies item quantities by boxes ordered", () => {
  const all = catalogWithBox("fixed");
  const box = all.find((p) => p.id === "p900")!;
  assert.deepEqual(bundleTakes(box.bundle!, 3).map((t) => t.qty), [3, 6, 3]);
});

test("toInput round-trips a box, and CSV import keeps its contents", () => {
  const all = catalogWithBox("discount");
  const box = all.find((p) => p.id === "p900")!;
  const again = validateProduct(toInput(box), all.filter((p) => p.id !== box.id), box, NOW, box.id);
  assert.ok(again.ok);
  if (again.ok) assert.deepEqual(again.product.bundle, box.bundle);
  const plan = planImport(productsToCsv([box]), all, NOW);
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.products[0].bundle, box.bundle);
});
