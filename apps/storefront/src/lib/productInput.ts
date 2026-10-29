import { DEPARTMENTS, GARMENTS, GIFTS, slugify } from "./catalog.ts";
import { bundleSku, discountedBundlePrice, GIFT_BOX_COLOUR, GIFT_BOX_SIZE, validateBundle, type BundleInput } from "./bundles.ts";
import { pktLocalToIso } from "./productPricing.ts";
import { normaliseImages } from "./productImages.ts";
import type { Colour, DepartmentSlug, Garment, Product, ProductImage, ProductStatus, Variant } from "./types";

// One validation path for the product editor and CSV import (FR-ADM-02).
// Prices arrive in whole rupees (what staff type); they are stored in paisa.

export interface VariantInput {
  colour: string;
  size: string;
  sku?: string;
  stock: number | string;
}

export interface ProductInput {
  id?: string;
  name: string;
  slug?: string;
  status: ProductStatus | string;
  department: DepartmentSlug | string;
  category: string;
  garment: Garment | string;
  basePrice: number | string;
  salePrice?: number | string | null;
  /** Karachi wall-clock "YYYY-MM-DDTHH:mm" or ISO. Empty = no bound. */
  saleStartsAt?: string;
  saleEndsAt?: string;
  fabric: string;
  fit: string;
  description: string;
  care: string[] | string;
  tags: string[] | string;
  modelInfo?: string;
  preOrderDispatch?: string;
  colours: Colour[];
  sizes: string[];
  variants: VariantInput[];
  /** Omitted (e.g. CSV import) = keep the product's current photos. */
  images?: ProductImage[];
  /** Gift boxes (Tohfa-e-Khaas) only. Omitted = keep the current contents. */
  bundle?: BundleInput;
}

export type FieldErrors = Record<string, string>;

export type ValidationResult = { ok: true; product: Product } | { ok: false; errors: FieldErrors };

const STATUSES: ProductStatus[] = ["active", "draft", "archived"];
const MAX_RUPEES = 1_000_000;

function toList(v: string[] | string | undefined, sep: RegExp): string[] {
  const arr = Array.isArray(v) ? v : (v ?? "").split(sep);
  return arr.map((x) => x.trim()).filter(Boolean);
}

function toRupees(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined || String(v).trim() === "") return undefined;
  const n = Number(String(v).replace(/[,\s]|^Rs\.?/gi, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** ISO stays ISO; Karachi local datetime is converted. */
function toIso(v: string | undefined): string | undefined | null {
  const s = (v ?? "").trim();
  if (!s) return undefined;
  if (/Z$|[+-]\d{2}:\d{2}$/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  return pktLocalToIso(s) ?? null;
}

export function autoSku(productId: string, colour: string, size: string): string {
  const col = colour.replace(/[^a-z]/gi, "").slice(0, 3).toUpperCase() || "COL";
  const sz = size.replace(/[^a-z0-9]/gi, "").toUpperCase() || "OS";
  return `LUF-${productId.toUpperCase()}-${col}-${sz}`;
}

export function nextProductId(existing: { id: string }[]): string {
  const max = existing.reduce((m, p) => Math.max(m, parseInt(p.id.replace(/\D/g, ""), 10) || 0), 0);
  return `p${String(max + 1).padStart(3, "0")}`;
}

/**
 * Validates input and returns a full Product (derived price fields are set to the
 * regular price; the store re-derives them at read time).
 * `others` = every other product in the store, for slug/SKU uniqueness.
 */
export function validateProduct(input: ProductInput, others: Product[], current: Product | undefined, nowIso: string, newId: string): ValidationResult {
  const e: FieldErrors = {};
  const name = (input.name ?? "").trim();
  if (name.length < 3 || name.length > 120) e.name = "Name must be 3–120 characters.";

  const dept = DEPARTMENTS.find((d) => d.slug === input.department);
  if (!dept) e.department = "Choose a department.";
  const cat = dept?.categories.find((c) => c.slug === input.category);
  if (dept && !cat) e.category = `Choose a ${dept.label} category.`;
  if (!GARMENTS.some((g) => g.value === input.garment)) e.garment = "Choose an image type.";
  if (!STATUSES.includes(input.status as ProductStatus)) e.status = "Status must be active, draft or archived.";

  const slug = (input.slug ?? "").trim() || (name && dept ? `${slugify(name)}-${dept.slug}` : "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) e.slug = "Use lowercase letters, numbers and hyphens.";
  else if (others.some((p) => p.slug === slug)) e.slug = "Another product already uses this URL.";

  // Gift boxes: contents are validated against the rest of the catalogue
  const isBox = dept?.slug === GIFTS;
  const boxInput: BundleInput | undefined =
    input.bundle ?? (current?.bundle ? { items: current.bundle.items, mode: current.bundle.pricing.mode, percent: current.bundle.pricing.mode === "discount" ? current.bundle.pricing.percent : undefined } : undefined);
  const box = isBox ? validateBundle(boxInput, others) : undefined;
  if (box && !box.ok) e.bundle = box.error;
  const discountBox = box?.ok && box.bundle.pricing.mode === "discount" ? box : undefined;

  // Discount-mode boxes get their price from the items, so no price is typed
  const base = discountBox ? Math.round(discountedBundlePrice(discountBox.regularValue, (discountBox.bundle.pricing as { percent: number }).percent) / 100) : toRupees(input.basePrice);
  if (base === undefined || !Number.isInteger(base) || base < 1 || base > MAX_RUPEES) e.basePrice = "Enter a whole-rupee price between 1 and 1,000,000.";

  const salePrice = toRupees(input.salePrice);
  const startsAt = toIso(input.saleStartsAt);
  const endsAt = toIso(input.saleEndsAt);
  if (salePrice !== undefined) {
    if (!Number.isInteger(salePrice) || salePrice < 1) e.salePrice = "Enter a whole-rupee sale price.";
    else if (base !== undefined && salePrice >= base) e.salePrice = "Sale price must be lower than the regular price.";
  } else if (startsAt || endsAt) {
    e.salePrice = "Add a sale price, or clear the sale dates.";
  }
  if (startsAt === null) e.saleStartsAt = "Invalid start date.";
  if (endsAt === null) e.saleEndsAt = "Invalid end date.";
  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) e.saleEndsAt = "Sale must end after it starts.";
  if (discountBox && salePrice !== undefined) e.salePrice = "A box priced by % discount can't also have a sale price. Use a fixed price instead.";

  const fabric = (input.fabric ?? "").trim() || (isBox ? "Assorted" : "");
  if (!fabric || fabric.length > 80) e.fabric = "Fabric is required (max 80 characters).";
  const fit = (input.fit ?? "").trim() || "Regular";
  const description = (input.description ?? "").trim();
  if (description.length < 20 || description.length > 2000) e.description = "Description must be 20–2,000 characters.";

  // Colours and sizes (a gift box is a single "Gift box / One Size" unit)
  const colours: Colour[] = isBox ? [GIFT_BOX_COLOUR] : [];
  for (const c of isBox ? [] : input.colours ?? []) {
    const nm = (c.name ?? "").trim();
    if (!nm) continue;
    if (colours.some((x) => x.name.toLowerCase() === nm.toLowerCase())) e.colours = `Colour "${nm}" is listed twice.`;
    else if (!/^#[0-9a-f]{6}$/i.test(c.hex ?? "")) e.colours = `Colour "${nm}" needs a hex value like #1B1B1B.`;
    else colours.push({ name: nm, hex: c.hex.toUpperCase() });
  }
  if (!colours.length && !e.colours) e.colours = "Add at least one colour.";

  const sizes = isBox ? [GIFT_BOX_SIZE] : Array.from(new Set((input.sizes ?? []).map((s) => s.trim()).filter(Boolean)));
  if (!sizes.length) e.sizes = "Add at least one size.";
  if (sizes.some((s) => s.length > 12)) e.sizes = "Sizes must be 12 characters or fewer.";

  // Variants: exactly one per colour × size. Missing cells default to 0 stock.
  const id = current?.id ?? newId;
  const otherSkus = new Set(others.flatMap((p) => p.variants.map((v) => v.sku)));
  const seen = new Set<string>();
  const variants: Variant[] = [];
  // A box's own stock is derived from its items, so its single variant holds 0
  if (isBox) variants.push({ sku: bundleSku(id), size: GIFT_BOX_SIZE, colour: GIFT_BOX_COLOUR.name, stock: 0 });
  else for (const col of colours) {
    for (const size of sizes) {
      const vin = (input.variants ?? []).find((v) => v.colour.trim().toLowerCase() === col.name.toLowerCase() && v.size.trim() === size);
      const stock = Number(vin?.stock ?? 0);
      const sku = ((vin?.sku ?? "").trim() || autoSku(id, col.name, size)).toUpperCase();
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) e.variants = `Stock for ${col.name} / ${size} must be a whole number from 0 to 100,000.`;
      else if (!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(sku)) e.variants = `SKU "${sku}" must be 3–40 letters, numbers or hyphens.`;
      else if (seen.has(sku) || otherSkus.has(sku)) e.variants = `SKU "${sku}" is already in use.`;
      seen.add(sku);
      variants.push({ sku, size, colour: col.name, stock: Number.isInteger(stock) ? stock : 0 });
    }
  }

  const { images, error: imageError } = normaliseImages(input.images ?? current?.images ?? [], colours);
  if (imageError) e.images = imageError;

  if (Object.keys(e).length) return { ok: false, errors: e };

  const basePaisa = base! * 100;
  const sale =
    salePrice !== undefined
      ? { price: salePrice * 100, ...(startsAt ? { startsAt } : {}), ...(endsAt ? { endsAt } : {}) }
      : undefined;
  const preOrder = (input.preOrderDispatch ?? "").trim();

  const product: Product = {
    id,
    status: input.status as ProductStatus,
    slug,
    name,
    department: dept!.slug,
    category: cat!.slug,
    group: cat!.group,
    garment: input.garment as Garment,
    basePrice: basePaisa,
    sale,
    price: basePaisa,
    compareAt: undefined,
    colours,
    sizes,
    variants,
    ...(images.length ? { images } : {}),
    ...(box?.ok ? { bundle: box.bundle } : {}),
    fabric,
    fit,
    care: toList(input.care, /\r?\n|\|/).slice(0, 10),
    description,
    modelInfo: (input.modelInfo ?? "").trim() || undefined,
    tags: toList(input.tags, /[,|]/).map((t) => t.toLowerCase()).slice(0, 20),
    createdAt: current?.createdAt ?? nowIso,
    updatedAt: nowIso,
    salesRank: current?.salesRank ?? 999,
    preOrder: preOrder ? { dispatch: preOrder.slice(0, 40) } : undefined,
    rating: current?.rating ?? 0,
    reviews: current?.reviews ?? [],
  };
  return { ok: true, product };
}

/** The editor/CSV shape of an existing product (prices back in rupees). */
export function toInput(p: Product): ProductInput {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    department: p.department,
    category: p.category,
    garment: p.garment,
    basePrice: p.basePrice / 100,
    salePrice: p.sale ? p.sale.price / 100 : "",
    saleStartsAt: p.sale?.startsAt ?? "",
    saleEndsAt: p.sale?.endsAt ?? "",
    fabric: p.fabric,
    fit: p.fit,
    description: p.description,
    care: p.care,
    tags: p.tags,
    modelInfo: p.modelInfo ?? "",
    preOrderDispatch: p.preOrder?.dispatch ?? "",
    colours: p.colours,
    sizes: p.sizes,
    variants: p.variants.map((v) => ({ colour: v.colour, size: v.size, sku: v.sku, stock: v.stock })),
    images: p.images ?? [],
    ...(p.bundle
      ? { bundle: { items: p.bundle.items, mode: p.bundle.pricing.mode, percent: p.bundle.pricing.mode === "discount" ? p.bundle.pricing.percent : undefined } }
      : {}),
  };
}
