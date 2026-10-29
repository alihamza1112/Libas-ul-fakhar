import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { materialize } from "../productPricing";
import { resolveBundles } from "../bundles";
import type { Product } from "../types";
import { readProducts } from "./store";

export const CATALOG_TAG = "catalog";

/**
 * Active products as the storefront sees them, priced for "now".
 * Cached and tagged: admin edits call updateTag(CATALOG_TAG) so they show at once;
 * the "minutes" profile re-derives prices about every minute, so scheduled sales
 * start and end on their own (BRD: changes live within 1 minute).
 */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");
  const now = Date.now();
  return resolveBundles((await readProducts()).filter((p) => p.status === "active").map((p) => materialize(p, now)));
}

export async function getCatalogProduct(slug: string): Promise<Product | undefined> {
  return (await getCatalog()).find((p) => p.slug === slug);
}
