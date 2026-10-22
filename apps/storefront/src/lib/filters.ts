import { discountPct } from "./catalog";
import type { Product } from "./types";

// Filter + sort state lives in the URL (FR-PLP-07) so listings are shareable.

export type SortKey = "featured" | "new" | "price-asc" | "price-desc" | "best" | "discount";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "new", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "best", label: "Best selling" },
  { key: "discount", label: "Biggest discount" },
];

export const PRICE_BANDS = [
  { key: "0-2000", label: "Under Rs. 2,000", min: 0, max: 2000_00 },
  { key: "2000-4000", label: "Rs. 2,000 – 4,000", min: 2000_00, max: 4000_00 },
  { key: "4000-7000", label: "Rs. 4,000 – 7,000", min: 4000_00, max: 7000_00 },
  { key: "7000-up", label: "Over Rs. 7,000", min: 7000_00, max: Infinity },
];

export const PAGE_SIZE = 12;

export interface FilterState {
  category: string[];
  size: string[];
  colour: string[];
  price: string[];
  fit: string[];
  fabric: string[];
  instock: boolean;
  onsale: boolean;
  sort: SortKey;
  page: number;
}

type SP = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return (Array.isArray(v) ? v : v.split(",")).flatMap((x) => x.split(",")).filter(Boolean);
}

export function parseFilters(sp: SP): FilterState {
  const sort = (typeof sp.sort === "string" ? sp.sort : "featured") as SortKey;
  return {
    category: list(sp.category),
    size: list(sp.size),
    colour: list(sp.colour),
    price: list(sp.price),
    fit: list(sp.fit),
    fabric: list(sp.fabric),
    instock: sp.instock === "1",
    onsale: sp.onsale === "1",
    sort: SORTS.some((s) => s.key === sort) ? sort : "featured",
    page: Math.max(1, Math.min(50, parseInt(String(sp.page ?? "1"), 10) || 1)),
  };
}

export function applyFilters(products: Product[], f: FilterState): Product[] {
  const bands = PRICE_BANDS.filter((b) => f.price.includes(b.key));
  const out = products.filter((p) => {
    if (f.category.length && !f.category.includes(p.category)) return false;
    if (f.fit.length && !f.fit.includes(p.fit)) return false;
    if (f.fabric.length && !f.fabric.includes(p.fabric)) return false;
    if (f.onsale && !p.compareAt) return false;
    if (bands.length && !bands.some((b) => p.price >= b.min && p.price < b.max)) return false;
    if (f.colour.length && !p.colours.some((c) => f.colour.includes(c.name))) return false;
    if (f.size.length || f.instock) {
      const ok = p.variants.some(
        (v) =>
          (!f.size.length || f.size.includes(v.size)) &&
          (!f.colour.length || f.colour.includes(v.colour)) &&
          (!f.instock || v.stock > 0 || !!p.preOrder),
      );
      if (!ok) return false;
    }
    return true;
  });
  return sortProducts(out, f.sort);
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const a = [...products];
  switch (sort) {
    case "new": return a.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    case "price-asc": return a.sort((x, y) => x.price - y.price);
    case "price-desc": return a.sort((x, y) => y.price - x.price);
    case "best": return a.sort((x, y) => x.salesRank - y.salesRank);
    case "discount": return a.sort((x, y) => discountPct(y) - discountPct(x));
    default: {
      // Featured: in-stock first, then new, then best selling
      const inStock = (p: Product) => (p.variants.some((v) => v.stock > 0) || p.preOrder ? 0 : 1);
      return a.sort((x, y) => inStock(x) - inStock(y) || x.salesRank - y.salesRank);
    }
  }
}

/** Facet values available in the current base set, so empty options aren't shown. */
export function facets(products: Product[]) {
  const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));
  const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y", "One Size"];
  return {
    sizes: uniq(products.flatMap((p) => p.sizes)).sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b)),
    colours: Array.from(new Map(products.flatMap((p) => p.colours).map((c) => [c.name, c])).values()),
    fits: uniq(products.map((p) => p.fit)).sort(),
    fabrics: uniq(products.map((p) => p.fabric)).sort(),
  };
}
