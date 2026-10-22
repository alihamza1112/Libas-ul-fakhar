import { test } from "node:test";
import assert from "node:assert/strict";
import { altFor, imagesFor, imageUrl, normaliseImages, ratioWarning, removedImageIds } from "./productImages.ts";
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
