import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, searchProducts } from "./search.ts";
import type { Product } from "./types";

const base = {
  id: "x", slug: "x", group: "Eastern", category: "kurta", sizes: [], variants: [], fit: "", care: [], description: "",
  createdAt: "", salesRank: 1, rating: 0, reviews: [],
} as unknown as Product;

const products: Product[] = [
  { ...base, id: "1", name: "Noor Cotton Kurta", department: "men", garment: "kurta", price: 549000, fabric: "Cotton", tags: ["eid"], colours: [{ name: "Black", hex: "" }] },
  { ...base, id: "2", name: "Oxford Shirt", department: "men", garment: "shirt", category: "shirts", group: "Western", price: 299000, fabric: "Cotton", tags: ["formal"], colours: [{ name: "Black", hex: "" }] },
  { ...base, id: "3", name: "Bahaar Lawn Suit", department: "women", garment: "kameez", category: "shalwar-kameez", price: 419000, fabric: "Lawn", tags: [], colours: [{ name: "Sage", hex: "" }] },
];

test("parses price constraints", () => {
  assert.deepEqual(parseQuery("black formal shirt under 3000"), { terms: ["black", "formal", "shirt"], maxPrice: 300000, minPrice: undefined });
  assert.equal(parseQuery("kurta under 5k").maxPrice, 500000);
});

test("natural-language query with price", () => {
  assert.deepEqual(searchProducts(products, "black formal shirt under 3000").map((p) => p.id), ["2"]);
});

test("roman-urdu synonyms", () => {
  assert.deepEqual(searchProducts(products, "shalwar").map((p) => p.id), ["3"]);
  assert.deepEqual(searchProducts(products, "kurti").map((p) => p.id), ["1"]);
});

test("typo tolerance", () => {
  assert.deepEqual(searchProducts(products, "kurtta").map((p) => p.id), ["1"]);
  assert.deepEqual(searchProducts(products, "oxfrod").map((p) => p.id), ["2"]);
});

test("no match returns empty", () => {
  assert.deepEqual(searchProducts(products, "sneakers"), []);
});
