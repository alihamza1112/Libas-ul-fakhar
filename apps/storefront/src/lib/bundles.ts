import { imagesFor } from "./productImages.ts";
import type { Bundle, BundleContent, BundlePricing, Product } from "./types";

// Tohfa-e-Khaas gift boxes. A gift box is a product whose "bundle" lists fixed
// items (each an exact size/colour, chosen by the admin). It sells as one unit:
//  - stock  = how many complete boxes the items' stock allows
//  - price  = a fixed price the admin sets, or the items' total minus a percent
// Ordering a box takes stock from each item; cancelling puts it back.

export const MIN_BUNDLE_ITEMS = 2;
export const MAX_BUNDLE_ITEMS = 12;
export const GIFT_BOX_COLOUR = { name: "Gift box", hex: "#B8954A" };
export const GIFT_BOX_SIZE = "One Size";

export function bundleSku(productId: string): string {
  return `LUF-${productId.toUpperCase()}-GIFT`;
}

/** Discount-mode price: the items' total minus `percent`, rounded to whole tens of rupees. */
export function discountedBundlePrice(value: number, percent: number): number {
  return Math.max(100, Math.round((value * (100 - percent)) / 100 / 1000) * 1000);
}

export type BundleInput = { items?: { productId?: unknown; sku?: unknown; qty?: unknown }[]; mode?: unknown; percent?: unknown };

/**
 * Validates gift box contents against the rest of the catalogue.
 * Returns the bundle and its value at regular prices (used to set the stored price
 * in discount mode), or an error message.
 */
export function validateBundle(input: BundleInput | undefined, others: Product[]): { ok: true; bundle: Bundle; regularValue: number } | { ok: false; error: string } {
  const raw = Array.isArray(input?.items) ? input!.items : [];
  const items: Bundle["items"] = [];
  let regularValue = 0;
  for (const it of raw) {
    const p = others.find((x) => x.id === String(it.productId ?? ""));
    const v = p?.variants.find((x) => x.sku === String(it.sku ?? ""));
    if (!p || !v) return { ok: false, error: "One of the box items no longer exists. Remove it and add it again." };
    if (p.bundle) return { ok: false, error: `${p.name} is itself a gift box and can't go inside another box.` };
    const qty = Number(it.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return { ok: false, error: `Quantity for ${p.name} must be 1–10.` };
    if (items.some((x) => x.sku === v.sku)) return { ok: false, error: `${p.name} (${v.colour}, ${v.size}) is in the box twice. Increase its quantity instead.` };
    items.push({ productId: p.id, sku: v.sku, qty });
    regularValue += p.basePrice * qty;
  }
  if (items.length < MIN_BUNDLE_ITEMS) return { ok: false, error: `Add at least ${MIN_BUNDLE_ITEMS} items to the gift box.` };
  if (items.length > MAX_BUNDLE_ITEMS) return { ok: false, error: `A gift box can hold at most ${MAX_BUNDLE_ITEMS} different items.` };

  let pricing: BundlePricing = { mode: "fixed" };
  if (input?.mode === "discount") {
    const percent = Number(input.percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) return { ok: false, error: "Discount must be a whole number from 1 to 90%." };
    pricing = { mode: "discount", percent };
  }
  return { ok: true, bundle: { items, pricing }, regularValue };
}

/**
 * Fills in gift boxes' derived fields from the (already priced) catalogue:
 * contents, value if bought separately, price (discount mode) and stock.
 * Non-box products are returned unchanged.
 */
export function resolveBundles(products: Product[]): Product[] {
  const bySku = new Map<string, { p: Product; v: Product["variants"][number] }>();
  for (const p of products) for (const v of p.variants) bySku.set(v.sku, { p, v });

  return products.map((box) => {
    if (!box.bundle) return box;
    let value = 0;
    let stock = Number.POSITIVE_INFINITY;
    const contents: BundleContent[] = box.bundle.items.map((it) => {
      const hit = bySku.get(it.sku);
      const p = hit?.p;
      const v = hit?.v;
      const available = !!p && !!v && p.status === "active" && !p.bundle;
      // Pre-order items don't limit how many boxes can be sold
      const fits = !available ? 0 : p!.preOrder ? Number.POSITIVE_INFINITY : Math.floor(v!.stock / it.qty);
      stock = Math.min(stock, fits);
      const unitPrice = p?.price ?? 0;
      value += unitPrice * it.qty;
      return {
        ...it,
        name: p?.name ?? "Unavailable item",
        slug: p?.slug ?? "",
        colour: v?.colour ?? "",
        size: v?.size ?? "",
        hex: p?.colours.find((c) => c.name === v?.colour)?.hex ?? "#D8C3A5",
        garment: p?.garment ?? "giftbox",
        image: p && v ? imagesFor(p, v.colour)[0]?.url : undefined,
        unitPrice,
        available,
      };
    });
    const boxStock = Number.isFinite(stock) ? stock : 99;
    const priced =
      box.bundle.pricing.mode === "discount"
        ? { price: discountedBundlePrice(value, box.bundle.pricing.percent), compareAt: undefined }
        : { price: box.price, compareAt: box.compareAt };
    return {
      ...box,
      ...priced,
      bundleContents: contents,
      bundleValue: value,
      variants: box.variants.map((v) => ({ ...v, stock: boxStock })),
    };
  });
}

/** Units each gift box takes from each item, for `qty` boxes. */
export function bundleTakes(bundle: Bundle, qty: number): { sku: string; qty: number }[] {
  return bundle.items.map((it) => ({ sku: it.sku, qty: it.qty * qty }));
}
