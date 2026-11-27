import { test } from "node:test";
import assert from "node:assert/strict";
import { altFor, fitPlan, imagesFor, imageUrl, normaliseImages, ratioWarning, removedImageIds } from "./productImages.ts";
import { validateProduct } from "./productInput.ts";
import { toInput } from "./productInput.ts";
import { planImport, productsToCsv } from "./productCsv.ts";
import { SEED_PRODUCTS } from "./catalog.ts";
import type { ProductImage } from "./types";

const id = (n: number) => n.toString(16).padStart(16, "0");
const img = (n: number, colour?: string): ProductImage => ({ id: id(n), url: imageUrl(id(n)), width: 1600, height: 2000, ...(colour ? { colour } : {}) });
const colours = [{ name: "Ivory", hex: "#F3EBDD" }, { name: "Black", hex: "#1B1B1B" }];

test("photos for a colour come first, then shared photos", () => {
  const p = { images: [img(1, "Black"), img(2), img(3, "Ivory"), img(4, "Ivory")] };
  assert.deepEqual(imagesFor(p, "Ivory").map((i) => i.id), [id(3), id(4), id(2)]);
  assert.deepEqual(imagesFor(p, "Black").map((i) => i.id), [id(1), id(2)]);
});

test("a colour with no photos of its own falls back to placeholder art, not another colour's photo", () => {
  assert.deepEqual(imagesFor({ images: [img(1, "Black")] }, "Ivory"), []);
  assert.deepEqual(imagesFor({ images: undefined }, "Ivory"), []);
});

test("normalise drops bad/duplicate ids and re-points removed colours to all colours", () => {
  const { images, error } = normaliseImages(
    [img(1, "Ivory"), img(1, "Ivory"), { ...img(2, "Maroon") }, { id: "../../etc/passwd", url: "x", width: 1, height: 1 }, { ...img(3), width: 0 }, { ...img(4, "Black"), url: "https://evil.example/x.jpg", alt: "  Back view  " }],
    colours,
  );
  assert.equal(error, undefined);
  assert.deepEqual(images, [img(1, "Ivory"), img(2), { ...img(4, "Black"), alt: "Back view" }]);
});

test("limits are enforced", () => {
  const many = Array.from({ length: 11 }, (_, i) => img(i + 1, "Ivory"));
  assert.match(normaliseImages(many, colours).error ?? "", /Ivory has more than 10/);
});

test("alt text, ratio warnings and removed ids", () => {
  assert.equal(altFor({ name: "Noor Kurta" }, img(1, "Ivory"), 1), "Noor Kurta in Ivory – view 2");
  assert.equal(ratioWarning({ width: 1600, height: 2000 }), undefined);
  assert.match(ratioWarning({ width: 2000, height: 2000 }) ?? "", /Wider/);
  assert.deepEqual(removedImageIds([img(1), img(2)], [img(2)]), [id(1)]);
});

test("product validation stores photos and CSV import keeps them", () => {
  const seed = SEED_PRODUCTS[0];
  const withPhotos = validateProduct({ ...toInput(seed), images: [img(7, seed.colours[0].name), img(8)] }, SEED_PRODUCTS.slice(1), seed, "2026-10-22T00:00:00.000Z", seed.id);
  assert.ok(withPhotos.ok);
  if (!withPhotos.ok) return;
  const stored = withPhotos.product;
  assert.equal(stored.images?.length, 2);
  // Re-import the exported row set: photos are not in the CSV and must survive
  const plan = planImport(productsToCsv([stored]), [stored, ...SEED_PRODUCTS.slice(1)], "2026-10-22T00:00:00.000Z");
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.products[0].images, stored.images);
});

test("uploads become 4:5 portraits no wider than 1600px", () => {
  // Already 4:5, larger than needed: scaled down only
  assert.deepEqual(fitPlan(3200, 4000), { mode: "none", width: 1600, height: 2000 });
  // Phone portrait 3:4 is a little too tall: crop top/bottom
  assert.deepEqual(fitPlan(3024, 4032), { mode: "crop", width: 1600, height: 2000 });
  // Square loses 20%: still cropped
  assert.equal(fitPlan(2000, 2000).mode, "crop");
  // Landscape would lose too much: padded, never cut
  assert.deepEqual(fitPlan(4032, 3024), { mode: "pad", width: 1600, height: 2000 });
  // Very tall strip: padded at the sides
  assert.equal(fitPlan(1000, 3000).mode, "pad");
  // Small photos are never enlarged
  assert.deepEqual(fitPlan(800, 1000), { mode: "none", width: 800, height: 1000 });
  assert.deepEqual(fitPlan(600, 600), { mode: "crop", width: 480, height: 600 });
  for (const [w, h] of [[3024, 4032], [4032, 3024], [500, 2000], [2000, 500], [1234, 1567]]) {
    const p = fitPlan(w, h);
    assert.ok(Math.abs(p.width / p.height - 0.8) < 0.002, `${w}×${h} → ${p.width}×${p.height}`);
    assert.ok(p.width <= 1600);
  }
});
