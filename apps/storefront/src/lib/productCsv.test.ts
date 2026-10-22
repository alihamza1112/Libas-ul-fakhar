import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, toCsv } from "./csv.ts";
import { SEED_PRODUCTS } from "./catalog.ts";
import { autoSku, validateProduct, type ProductInput } from "./productInput.ts";
import { planImport, productsToCsv } from "./productCsv.ts";

const NOW = "2026-10-22T00:00:00.000Z";

test("csv parser handles quotes, commas, newlines, CRLF and BOM", () => {
  const text = '﻿a,b,c\r\n1,"two, 2","line\nbreak"\r\n"say ""hi""",,x\r\n\r\n';
  assert.deepEqual(parseCsv(text), [["a", "b", "c"], ["1", "two, 2", "line\nbreak"], ['say "hi"', "", "x"]]);
});

test("csv writer round-trips and neutralises formulas", () => {
  const out = toCsv(["h1", "h2"], [["=SUM(A1)", 'He said "x", ok'], [-5, ""]]);
  assert.deepEqual(parseCsv(out), [["h1", "h2"], ["'=SUM(A1)", 'He said "x", ok'], ["-5", ""]]);
});

const good: ProductInput = {
  name: "Test Linen Kurta",
  status: "active",
  department: "men",
  category: "kurta",
  garment: "kurta",
  basePrice: "4,990",
  salePrice: 3990,
  saleStartsAt: "2026-11-01T10:00",
  saleEndsAt: "2026-11-03T23:59",
  fabric: "Linen",
  fit: "Regular",
  description: "A breathable linen kurta for warm evenings.",
  care: "Machine wash cold\nIron medium",
  tags: "Summer, Eid",
  colours: [{ name: "Sand", hex: "#d8c3a5" }],
  sizes: ["M", "L"],
  variants: [{ colour: "Sand", size: "M", stock: 5 }],
};

test("valid input becomes a product in paisa with a PKT-scheduled sale", () => {
  const r = validateProduct(good, SEED_PRODUCTS, undefined, NOW, "p900");
  assert.ok(r.ok);
  if (!r.ok) return;
  const p = r.product;
  assert.equal(p.slug, "test-linen-kurta-men");
  assert.equal(p.basePrice, 499000);
  assert.deepEqual(p.sale, { price: 399000, startsAt: "2026-11-01T05:00:00.000Z", endsAt: "2026-11-03T18:59:00.000Z" });
  assert.equal(p.group, "Eastern");
  assert.deepEqual(p.tags, ["summer", "eid"]);
  assert.deepEqual(p.care, ["Machine wash cold", "Iron medium"]);
  // Missing L cell defaults to zero stock with an auto SKU
  assert.deepEqual(p.variants.map((v) => [v.sku, v.stock]), [[autoSku("p900", "Sand", "M"), 5], [autoSku("p900", "Sand", "L"), 0]]);
  assert.equal(p.colours[0].hex, "#D8C3A5");
});

test("validation errors are reported per field", () => {
  const r = validateProduct(
    { ...good, name: "X", category: "frocks", basePrice: "abc", salePrice: 6000, saleEndsAt: "2026-10-01T00:00", colours: [{ name: "Sand", hex: "tan" }], sizes: [] },
    SEED_PRODUCTS, undefined, NOW, "p900",
  );
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(Object.keys(r.errors).sort(), ["basePrice", "category", "colours", "name", "saleEndsAt", "sizes"].sort());
});

test("slug and SKU must be unique across the catalogue", () => {
  const taken = SEED_PRODUCTS[0];
  const r = validateProduct({ ...good, slug: taken.slug, variants: [{ colour: "Sand", size: "M", sku: taken.variants[0].sku, stock: 1 }] }, SEED_PRODUCTS, undefined, NOW, "p900");
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.ok(r.errors.slug);
  assert.ok(r.errors.variants);
});

const HEADER = "handle,name,status,department,category,garment,base_price,sale_price,sale_starts,sale_ends,fabric,fit,description,care,tags,pre_order_dispatch,model_info,colour,colour_hex,size,sku,stock";

test("import creates new products and updates existing ones, keeping stock when blank", () => {
  const seed = SEED_PRODUCTS[0];
  const csv = [
    HEADER,
    `new-kurta-men,New Kurta,active,men,kurta,kurta,3990,,,,Cotton,Regular,"A brand new cotton kurta, finished in our workshop.",,eid,,,Ivory,,M,,4`,
    `new-kurta-men,,,,,,,,,,,,,,,,,Ivory,,L,,2`,
    // price-only update of an existing product: stock column blank
    ...seed.variants.map((v) => `${seed.slug},${seed.name},active,${seed.department},${seed.category},${seed.garment},6000,,,,${seed.fabric},${seed.fit},"${seed.description}",,,,,${v.colour},,${v.size},${v.sku},`),
  ].join("\n");
  const plan = planImport(csv, SEED_PRODUCTS, NOW);
  assert.deepEqual(plan.errors, []);
  assert.deepEqual(plan.created, ["new-kurta-men"]);
  assert.deepEqual(plan.updated, [seed.slug]);
  const created = plan.products.find((p) => p.slug === "new-kurta-men")!;
  assert.equal(created.colours[0].hex, "#F3EBDD"); // known swatch name fills the hex
  assert.deepEqual(created.variants.map((v) => v.stock), [4, 2]);
  const updated = plan.products.find((p) => p.slug === seed.slug)!;
  assert.equal(updated.basePrice, 600000);
  assert.equal(updated.id, seed.id);
  assert.deepEqual(updated.variants.map((v) => v.stock), seed.variants.map((v) => v.stock));
});

test("import reports row-level errors and plans nothing usable", () => {
  const csv = [HEADER, `bad-one,Bad,active,men,nope,kurta,abc,,,,Cotton,,Too short,,,,,Ivory,,M,,1`, `,missing handle,,,,,,,,,,,,,,,,Ivory,,M,,1`].join("\n");
  const plan = planImport(csv, SEED_PRODUCTS, NOW);
  assert.ok(plan.errors.length >= 3);
  assert.equal(plan.errors[0].row, 2);
  assert.ok(plan.errors.some((e) => e.row === 3 && /handle/.test(e.message)));
});

test("missing required columns are rejected up front", () => {
  const plan = planImport("handle,name\nx,y", SEED_PRODUCTS, NOW);
  assert.match(plan.errors[0].message, /Missing column/);
});

test("export → import round-trips the whole seed catalogue with no changes", () => {
  const plan = planImport(productsToCsv(SEED_PRODUCTS), SEED_PRODUCTS, NOW);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.updated.length, SEED_PRODUCTS.length);
  for (const p of plan.products) {
    const orig = SEED_PRODUCTS.find((x) => x.id === p.id)!;
    assert.equal(p.basePrice, orig.basePrice);
    assert.deepEqual(p.sale, orig.sale);
    assert.deepEqual(p.variants, orig.variants);
  }
});
