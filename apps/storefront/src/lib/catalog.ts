import type { Colour, DepartmentSlug, Garment, Product, Review, Variant } from "./types";

// Department/category taxonomy and the seed catalogue. Live products are stored
// and edited through the admin (src/lib/server/store.ts); SEED_PRODUCTS only
// populates an empty store.

export interface Category {
  slug: string;
  label: string;
  group: Product["group"];
}

export interface Department {
  slug: DepartmentSlug;
  label: string;
  tagline: string;
  categories: Category[];
}

export const DEPARTMENTS: Department[] = [
  {
    slug: "men",
    label: "Men",
    tagline: "Tailored heritage for every occasion",
    categories: [
      { slug: "kurta", label: "Kurtas", group: "Eastern" },
      { slug: "shalwar-kameez", label: "Shalwar Kameez", group: "Eastern" },
      { slug: "waistcoats", label: "Waistcoats", group: "Eastern" },
      { slug: "shirts", label: "Shirts", group: "Western" },
      { slug: "polos", label: "Polos", group: "Western" },
      { slug: "trousers", label: "Trousers", group: "Western" },
      { slug: "accessories", label: "Shawls, Caps & Belts", group: "Accessories" },
    ],
  },
  {
    slug: "women",
    label: "Women",
    tagline: "Graceful silhouettes, crafted with pride",
    categories: [
      { slug: "kurta", label: "Kurtas", group: "Eastern" },
      { slug: "shalwar-kameez", label: "Shalwar Kameez", group: "Eastern" },
      { slug: "shirts", label: "Tops & Shirts", group: "Western" },
      { slug: "trousers", label: "Trousers", group: "Western" },
      { slug: "accessories", label: "Shawls & Dupattas", group: "Accessories" },
    ],
  },
  {
    slug: "boys",
    label: "Boys",
    tagline: "Little gentlemen, big occasions",
    categories: [
      { slug: "kurta", label: "Kurtas", group: "Eastern" },
      { slug: "shalwar-kameez", label: "Shalwar Kameez", group: "Eastern" },
      { slug: "tees", label: "T-Shirts", group: "Western" },
      { slug: "trousers", label: "Trousers", group: "Western" },
    ],
  },
  {
    slug: "girls",
    label: "Girls",
    tagline: "Playful colour, festive detail",
    categories: [
      { slug: "frocks", label: "Frocks", group: "Eastern" },
      { slug: "kurta", label: "Kurtas", group: "Eastern" },
      { slug: "tees", label: "T-Shirts", group: "Western" },
      { slug: "trousers", label: "Trousers", group: "Western" },
    ],
  },
];

const C: Record<string, Colour> = {
  ivory: { name: "Ivory", hex: "#F3EBDD" },
  white: { name: "White", hex: "#FAFAF7" },
  black: { name: "Black", hex: "#1B1B1B" },
  charcoal: { name: "Charcoal", hex: "#3B3B3D" },
  navy: { name: "Navy", hex: "#1F2A44" },
  sand: { name: "Sand", hex: "#D8C3A5" },
  camel: { name: "Camel", hex: "#B48A5E" },
  olive: { name: "Olive", hex: "#5F6640" },
  maroon: { name: "Maroon", hex: "#6B1F2A" },
  rose: { name: "Dusty Rose", hex: "#C99A92" },
  sage: { name: "Sage", hex: "#9DAA8F" },
  teal: { name: "Teal", hex: "#2F5D62" },
  mustard: { name: "Mustard", hex: "#C99B3B" },
  sky: { name: "Sky Blue", hex: "#9DB8CF" },
  lilac: { name: "Lilac", hex: "#B7A3C4" },
  brown: { name: "Chocolate", hex: "#5A3E2F" },
  emerald: { name: "Emerald", hex: "#1F5C46" },
};

const ADULT = ["XS", "S", "M", "L", "XL", "XXL"];
const WOMEN = ["XS", "S", "M", "L", "XL"];
const WAIST = ["28", "30", "32", "34", "36", "38"];
const KIDS = ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"];
const ONE = ["One Size"];

type Def = [
  DepartmentSlug,
  string, // category
  Garment,
  string, // name
  number, // price in rupees
  number, // discount %
  (keyof typeof C)[],
  string, // fabric
  string?, // fit
  { preOrder?: string; tags?: string[] }?,
];

const DEFS: Def[] = [
  // Men – Eastern
  ["men", "kurta", "kurta", "Noor Embroidered Cotton Kurta", 5490, 0, ["ivory", "sand", "black"], "Premium cotton lawn", "Regular", { tags: ["eid", "festive", "embroidered"] }],
  ["men", "kurta", "kurta", "Fakhar Classic Kurta", 3990, 30, ["white", "sky", "charcoal"], "Wash & wear blend", "Regular", { tags: ["everyday"] }],
  ["men", "kurta", "kurta", "Shahi Jacquard Kurta", 7990, 0, ["maroon", "navy"], "Self jacquard", "Slim", { preOrder: "7–10 days", tags: ["wedding", "festive"] }],
  ["men", "kurta", "kurta", "Riwaj Linen Kurta", 4790, 20, ["olive", "camel", "ivory"], "Linen blend", "Relaxed", { tags: ["summer"] }],
  ["men", "shalwar-kameez", "kameez", "Aseel Wash & Wear Shalwar Kameez", 6490, 0, ["white", "charcoal", "brown"], "Wash & wear", "Regular", { tags: ["everyday", "formal"] }],
  ["men", "shalwar-kameez", "kameez", "Mehfil Cotton Shalwar Kameez", 5990, 40, ["sand", "navy", "black"], "Egyptian cotton", "Regular", { tags: ["festive"] }],
  ["men", "shalwar-kameez", "kameez", "Darbar Karandi Suit", 8990, 15, ["camel", "charcoal"], "Karandi (winter)", "Regular", { tags: ["winter"] }],
  ["men", "waistcoats", "waistcoat", "Nawab Textured Waistcoat", 6990, 0, ["black", "maroon", "navy"], "Textured suiting", "Slim", { tags: ["wedding", "formal"] }],
  ["men", "waistcoats", "waistcoat", "Mughal Velvet Waistcoat", 9490, 25, ["emerald", "black"], "Velvet", "Slim", { tags: ["wedding", "festive"] }],
  // Men – Western
  ["men", "shirts", "shirt", "Oxford Button-Down Shirt", 3290, 0, ["white", "sky", "navy"], "100% cotton oxford", "Slim", { tags: ["formal", "office"] }],
  ["men", "shirts", "shirt", "Linen Resort Shirt", 3590, 50, ["sand", "sage", "ivory"], "Linen", "Relaxed", { tags: ["summer", "casual"] }],
  ["men", "shirts", "shirt", "Poplin Formal Shirt", 2990, 0, ["white", "black", "charcoal"], "Cotton poplin", "Regular", { tags: ["formal", "office"] }],
  ["men", "polos", "polo", "Piqué Polo", 2490, 30, ["navy", "black", "olive", "white"], "Cotton piqué", "Regular", { tags: ["casual"] }],
  ["men", "polos", "polo", "Knitted Textured Polo", 2990, 0, ["camel", "teal"], "Knitted cotton", "Slim", { tags: ["casual"] }],
  ["men", "trousers", "trouser", "Tailored Chino", 3490, 0, ["sand", "navy", "olive", "black"], "Stretch cotton twill", "Slim", { tags: ["casual", "office"] }],
  ["men", "trousers", "trouser", "Pleated Formal Trouser", 3990, 20, ["charcoal", "black"], "Poly-viscose suiting", "Regular", { tags: ["formal", "office"] }],
  ["men", "accessories", "shawl", "Kashmiri Wool Shawl", 7990, 0, ["camel", "charcoal", "brown"], "Pure wool", "One size", { tags: ["winter", "gift"] }],
  ["men", "accessories", "cap", "Sindhi Embroidered Cap", 1490, 0, ["maroon", "black"], "Mirror-work embroidery", "One size", { tags: ["festive", "gift"] }],
  ["men", "accessories", "belt", "Leather Dress Belt", 1990, 25, ["black", "brown"], "Genuine leather", "One size", { tags: ["formal", "gift"] }],
  // Women
  ["women", "kurta", "kurta", "Gul Printed Lawn Kurta", 3990, 0, ["rose", "sage", "ivory"], "Printed lawn", "Straight", { tags: ["summer", "everyday"] }],
  ["women", "kurta", "kurta", "Zari Chikankari Kurta", 7490, 20, ["ivory", "lilac", "mustard"], "Cotton net with chikankari", "A-line", { tags: ["festive", "eid", "embroidered"] }],
  ["women", "kurta", "kurta", "Raat Ki Rani Velvet Kurta", 9990, 0, ["maroon", "emerald", "black"], "Velvet", "Straight", { preOrder: "10–14 days", tags: ["wedding", "winter"] }],
  ["women", "shalwar-kameez", "kameez", "Bahaar 3-Piece Lawn Suit", 6990, 40, ["sage", "rose", "sky"], "Lawn with chiffon dupatta", "Regular", { tags: ["summer", "eid"] }],
  ["women", "shalwar-kameez", "kameez", "Mahal Embroidered 3-Piece", 11990, 0, ["teal", "maroon"], "Raw silk", "Regular", { tags: ["wedding", "festive", "embroidered"] }],
  ["women", "shalwar-kameez", "kameez", "Khaddar Winter 2-Piece", 5490, 30, ["mustard", "brown", "olive"], "Khaddar", "Relaxed", { tags: ["winter"] }],
  ["women", "shirts", "shirt", "Silk Satin Blouse", 3990, 0, ["ivory", "black", "rose"], "Satin", "Relaxed", { tags: ["office", "casual"] }],
  ["women", "shirts", "shirt", "Cotton Tunic Top", 2790, 50, ["white", "sky", "lilac"], "Cotton", "Regular", { tags: ["casual", "summer"] }],
  ["women", "trousers", "trouser", "Straight Cigarette Pants", 2990, 0, ["black", "ivory", "sand"], "Stretch cambric", "Straight", { tags: ["everyday"] }],
  ["women", "trousers", "trouser", "Wide-Leg Culottes", 3290, 25, ["sand", "charcoal"], "Linen blend", "Wide", { tags: ["summer"] }],
  ["women", "accessories", "shawl", "Pashmina Embroidered Shawl", 8990, 0, ["ivory", "maroon", "camel"], "Pashmina blend", "One size", { tags: ["winter", "gift", "embroidered"] }],
  ["women", "accessories", "shawl", "Chiffon Dupatta", 1990, 30, ["rose", "sage", "lilac", "ivory"], "Chiffon", "One size", { tags: ["festive"] }],
  // Boys
  ["boys", "kurta", "kurta", "Junior Festive Kurta", 2490, 0, ["white", "sky", "mustard"], "Cotton", "Regular", { tags: ["eid", "festive"] }],
  ["boys", "kurta", "kurta", "Little Nawab Kurta Set", 3290, 30, ["navy", "maroon"], "Jacquard", "Regular", { tags: ["wedding"] }],
  ["boys", "shalwar-kameez", "kameez", "Boys Wash & Wear Suit", 2990, 0, ["white", "charcoal", "sand"], "Wash & wear", "Regular", { tags: ["everyday"] }],
  ["boys", "tees", "tee", "Graphic Cotton Tee", 990, 40, ["navy", "olive", "white", "mustard"], "Jersey cotton", "Regular", { tags: ["casual"] }],
  ["boys", "trousers", "trouser", "Pull-On Chino", 1690, 0, ["sand", "navy"], "Cotton twill", "Regular", { tags: ["casual"] }],
  // Girls
  ["girls", "frocks", "frock", "Phool Embroidered Frock", 3490, 0, ["rose", "lilac", "ivory"], "Cotton net", "Flared", { tags: ["eid", "festive", "embroidered"] }],
  ["girls", "frocks", "frock", "Gharara Party Frock", 4290, 35, ["mustard", "emerald"], "Silk blend", "Flared", { preOrder: "5–7 days", tags: ["wedding"] }],
  ["girls", "kurta", "kurta", "Girls Printed Kurta", 1990, 0, ["sky", "rose", "sage"], "Lawn", "Straight", { tags: ["summer"] }],
  ["girls", "tees", "tee", "Everyday Cotton Tee", 890, 20, ["lilac", "white", "rose"], "Jersey cotton", "Regular", { tags: ["casual"] }],
  ["girls", "trousers", "trouser", "Girls Jogger Pants", 1490, 0, ["charcoal", "rose"], "Fleece-back jersey", "Relaxed", { tags: ["casual", "winter"] }],
];

// Deterministic pseudo-random so stock and dates are stable across builds.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sizesFor(dept: DepartmentSlug, garment: Garment): string[] {
  if (garment === "shawl" || garment === "cap" || garment === "belt") return ONE;
  if (dept === "boys" || dept === "girls") return KIDS;
  if (garment === "trouser" && dept === "men") return WAIST;
  return dept === "women" ? WOMEN : ADULT;
}

const CARE_BY_FABRIC: [RegExp, string[]][] = [
  [/wool|pashmina|velvet|silk/i, ["Dry clean only", "Store folded in a breathable bag", "Steam, do not iron directly"]],
  [/leather|embroider/i, ["Spot clean", "Keep away from moisture", "Store flat"]],
];
const DEFAULT_CARE = ["Machine wash cold, gentle cycle", "Wash dark colours separately", "Iron on medium heat, reverse side", "Do not bleach"];

const REVIEWERS = [
  ["Ayesha K.", "Lahore"],
  ["Hamza R.", "Karachi"],
  ["Fatima S.", "Islamabad"],
  ["Bilal A.", "Rawalpindi"],
  ["Sana M.", "Faisalabad"],
  ["Usman T.", "Multan"],
  ["Mariam Z.", "Peshawar"],
];
const REVIEW_TEXT = [
  ["Beautiful finishing", "Stitching is neat and the fabric feels premium. True to size."],
  ["Perfect for Eid", "Wore it for Eid and received so many compliments. Colour is exactly as shown."],
  ["Good value", "Great quality for the price, especially in the sale. Delivery took 3 days."],
  ["Comfortable fit", "Breathable and comfortable for long days. Would order again."],
  ["Slightly long", "Lovely piece but runs a little long, I'd suggest sizing down if you are petite."],
];

function buildReviews(seed: number): Review[] {
  const n = seed % 4;
  const out: Review[] = [];
  for (let i = 0; i < n; i++) {
    const r = REVIEWERS[(seed + i * 3) % REVIEWERS.length];
    const t = REVIEW_TEXT[(seed + i) % REVIEW_TEXT.length];
    const rating = t[0] === "Slightly long" ? 4 : 5 - ((seed >> (i + 2)) & 1);
    const d = new Date(Date.UTC(2026, 6 + ((seed >> i) % 3), 1 + ((seed >> 3) % 27)));
    out.push({ author: r[0], city: r[1], rating, title: t[0], body: t[1], date: d.toISOString().slice(0, 10), verified: true });
  }
  return out;
}

function build(def: Def, index: number): Product {
  const [department, category, garment, name, rupees, discount, colourKeys, fabric, fit = "Regular", opts = {}] = def;
  const slug = `${slugify(name)}-${department}`;
  const seed = hash(slug);
  const colours = colourKeys.map((k) => C[k]);
  const sizes = sizesFor(department, garment);
  const dept = DEPARTMENTS.find((d) => d.slug === department)!;
  const cat = dept.categories.find((c) => c.slug === category)!;

  const variants: Variant[] = [];
  colours.forEach((col, ci) => {
    sizes.forEach((size, si) => {
      const h = hash(`${slug}:${ci}:${si}`);
      // ~15% sold out, ~15% low stock, rest healthy
      const bucket = h % 100;
      const stock = bucket < 15 ? 0 : bucket < 30 ? 1 + (h % 3) : 6 + (h % 20);
      variants.push({
        sku: `LUF-${department.slice(0, 1).toUpperCase()}${String(index + 1).padStart(3, "0")}-${col.name.slice(0, 3).toUpperCase()}-${size.replace(/[^A-Z0-9]/gi, "").toUpperCase()}`,
        size,
        colour: col.name,
        stock,
      });
    });
  });

  // Sale prices end in 90, e.g. Rs. 2,790
  const price = Math.round((rupees * (100 - discount)) / 100 / 100) * 100 - 10;
  const created = new Date(Date.UTC(2026, 9, 20) - (seed % 120) * 86400000);
  const reviews = buildReviews(seed);
  const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const care = CARE_BY_FABRIC.find(([re]) => re.test(fabric))?.[1] ?? DEFAULT_CARE;
  const isKids = department === "boys" || department === "girls";

  return {
    id: `p${String(index + 1).padStart(3, "0")}`,
    status: "active",
    slug,
    name,
    department,
    category,
    group: cat.group,
    garment,
    basePrice: rupees * 100,
    sale: discount ? { price: price * 100 } : undefined,
    price: (discount ? price : rupees) * 100,
    compareAt: discount ? rupees * 100 : undefined,
    colours,
    sizes,
    variants,
    fabric,
    fit,
    care,
    description: `${name} in ${fabric.toLowerCase()}, cut for a ${fit.toLowerCase()} fit. Finished with care in our own workshop, it carries the quiet confidence that gives Libas-ul-Fakhar its name — a garment worn with pride.`,
    modelInfo: isKids || sizes === ONE ? undefined : department === "women" ? "Model is 5'7\" and wears size S" : "Model is 6'0\" and wears size M",
    tags: opts.tags ?? [],
    createdAt: created.toISOString(),
    salesRank: seed % 1000,
    preOrder: opts.preOrder ? { dispatch: opts.preOrder } : undefined,
    rating,
    reviews,
  };
}

export const SEED_PRODUCTS: Product[] = DEFS.map(build);

export function getDepartment(slug: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug);
}

export function categoryLabel(p: Product): string {
  return getDepartment(p.department)?.categories.find((c) => c.slug === p.category)?.label ?? p.category;
}

export function discountPct(p: { price: number; compareAt?: number }): number {
  return p.compareAt ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
}

export function totalStock(p: Product, colour?: string): number {
  return p.variants.filter((v) => !colour || v.colour === colour).reduce((s, v) => s + v.stock, 0);
}

export function isNew(p: Product): boolean {
  return !!p.isNew;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const GARMENTS: { value: Garment; label: string }[] = [
  { value: "kurta", label: "Kurta" },
  { value: "kameez", label: "Shalwar kameez" },
  { value: "waistcoat", label: "Waistcoat" },
  { value: "shirt", label: "Shirt / top" },
  { value: "polo", label: "Polo" },
  { value: "tee", label: "T-shirt" },
  { value: "trouser", label: "Trouser" },
  { value: "frock", label: "Frock" },
  { value: "shawl", label: "Shawl / dupatta" },
  { value: "cap", label: "Cap" },
  { value: "belt", label: "Belt" },
];

export const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "Men (XS–XXL)", sizes: ADULT },
  { label: "Women (XS–XL)", sizes: WOMEN },
  { label: "Waist (28–38)", sizes: WAIST },
  { label: "Kids (2–13Y)", sizes: KIDS },
  { label: "One size", sizes: ONE },
];

export const COLOUR_SWATCHES: Colour[] = Object.values(C);
