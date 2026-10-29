import type { Product } from "./types";

// Lightweight in-process search for the MVP. The production build swaps this
// for Meilisearch/Typesense behind the same function signature (FR-NAV-06).

// Roman-Urdu / Urdu-English synonyms (FR-NAV-02). Each group maps to one token.
const SYNONYMS: Record<string, string[]> = {
  kurta: ["kurta", "kurtas", "kurti", "kurtis", "kurtaa", "kurte"],
  kameez: ["kameez", "qameez", "kamiz", "kamees", "shalwar", "salwar", "shalwaar", "suit", "suits", "2-piece", "3-piece", "piece"],
  waistcoat: ["waistcoat", "waistcoats", "vest", "koti", "sadri"],
  shirt: ["shirt", "shirts", "blouse", "top", "tops", "tunic"],
  polo: ["polo", "polos"],
  tee: ["tee", "tees", "tshirt", "t-shirt", "t-shirts", "tshirts"],
  trouser: ["trouser", "trousers", "pant", "pants", "pajama", "pyjama", "chino", "chinos", "culottes", "joggers"],
  frock: ["frock", "frocks", "dress", "gharara", "farak"],
  shawl: ["shawl", "shawls", "chadar", "chaddar", "dupatta", "dupattas", "pashmina", "stole"],
  cap: ["cap", "topi", "topee"],
  belt: ["belt", "belts"],
  giftbox: ["gift", "gifts", "giftbox", "tohfa", "tohfay", "tohfe", "tohfa-e-khaas", "khaas", "hamper", "hampers", "box", "boxes", "bundle"],
  men: ["men", "mens", "man", "male", "gents", "mard"],
  women: ["women", "womens", "woman", "ladies", "female", "aurat"],
  boys: ["boys", "boy", "son", "larka", "kids"],
  girls: ["girls", "girl", "daughter", "larki", "kids"],
  wedding: ["wedding", "shaadi", "shadi", "barat", "baraat", "mehndi", "nikkah", "walima"],
  eid: ["eid", "festive", "ramzan", "ramadan"],
  black: ["black", "kala", "kaala"],
  white: ["white", "safaid", "safed"],
};

const TOKEN_TO_CANON = new Map<string, string>();
for (const [canon, words] of Object.entries(SYNONYMS)) for (const w of words) TOKEN_TO_CANON.set(w, canon);

/** Edit distance counting adjacent transpositions as one edit ("oxfrod" → "oxford"). */
function lev(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function haystack(p: Product): string[] {
  return [
    ...p.name.toLowerCase().split(/[^a-z0-9]+/),
    p.department,
    p.garment,
    p.category,
    p.group.toLowerCase(),
    ...p.fabric.toLowerCase().split(/[^a-z]+/),
    ...p.tags,
    ...p.colours.flatMap((c) => c.name.toLowerCase().split(" ")),
  ].filter(Boolean);
}

export interface ParsedQuery {
  terms: string[];
  maxPrice?: number;
  minPrice?: number;
}

/** Understands "black formal shirt under 3000" style queries (FR-NAV-07). */
export function parseQuery(q: string): ParsedQuery {
  let s = q.toLowerCase();
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  s = s.replace(/(?:under|below|less than|upto|up to|<)\s*(?:rs\.?\s*)?([\d,]+)k?/g, (m, n) => {
    maxPrice = parseInt(n.replace(/,/g, ""), 10) * (m.trim().endsWith("k") ? 1000 : 1) * 100;
    return " ";
  });
  s = s.replace(/(?:over|above|more than|>)\s*(?:rs\.?\s*)?([\d,]+)k?/g, (m, n) => {
    minPrice = parseInt(n.replace(/,/g, ""), 10) * (m.trim().endsWith("k") ? 1000 : 1) * 100;
    return " ";
  });
  const stop = new Set(["for", "the", "a", "an", "and", "with", "in", "of", "rs", "on", "sale"]);
  const terms = s.split(/[^a-z0-9-]+/).filter((t) => t && !stop.has(t));
  return { terms, maxPrice, minPrice };
}

function termScore(term: string, hay: string[]): number {
  const canon = TOKEN_TO_CANON.get(term);
  if (canon && hay.includes(canon)) return 3;
  if (hay.includes(term)) return 3;
  if (term.length >= 3 && hay.some((h) => h.startsWith(term))) return 2;
  // Typo tolerance: 1 edit for short words, 2 for longer ones
  const tol = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  if (tol && hay.some((h) => lev(term, h) <= tol)) return 1.5;
  if (tol) {
    for (const [w, c] of TOKEN_TO_CANON) if (lev(term, w) <= tol && hay.includes(c)) return 1.5;
  }
  return 0;
}

export function searchProducts(products: Product[], q: string): Product[] {
  const { terms, maxPrice, minPrice } = parseQuery(q);
  const priced = products.filter((p) => (maxPrice === undefined || p.price <= maxPrice) && (minPrice === undefined || p.price >= minPrice));
  if (!terms.length) return maxPrice || minPrice ? priced : [];
  const scored: { p: Product; s: number }[] = [];
  for (const p of priced) {
    const hay = haystack(p);
    let total = 0;
    let ok = true;
    for (const t of terms) {
      const sc = termScore(t, hay);
      if (!sc) {
        ok = false;
        break;
      }
      total += sc;
    }
    if (ok) scored.push({ p, s: total - p.salesRank / 10000 });
  }
  return scored.sort((a, b) => b.s - a.s).map((x) => x.p);
}

export const POPULAR_SEARCHES = ["Kurta", "Shalwar kameez", "Waistcoat", "Shawl", "Eid", "Wedding", "Polo", "Kids frock"];
