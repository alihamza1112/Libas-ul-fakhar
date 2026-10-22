import { COLOUR_SWATCHES } from "./catalog.ts";
import { parseCsv, toCsv } from "./csv.ts";
import { isoToPktLocal } from "./productPricing.ts";
import { nextProductId, validateProduct, type ProductInput, type VariantInput } from "./productInput.ts";
import type { Colour, Product } from "./types";

// Bulk product import/export (FR-ADM-02). One row per variant; product columns
// may be repeated on every row or given only on a product's first row.
// Import is all-or-nothing: any error and nothing is written.

export const CSV_COLUMNS = [
  "handle", "name", "status", "department", "category", "garment",
  "base_price", "sale_price", "sale_starts", "sale_ends",
  "fabric", "fit", "description", "care", "tags", "pre_order_dispatch", "model_info",
  "colour", "colour_hex", "size", "sku", "stock",
] as const;

const REQUIRED = ["handle", "name", "department", "category", "garment", "base_price", "colour", "size"];

type Col = (typeof CSV_COLUMNS)[number];

export interface ImportIssue {
  row: number; // spreadsheet row number (header = 1)
  handle: string;
  message: string;
}

export interface ImportPlan {
  products: Product[];
  created: string[];
  updated: string[];
  variantCount: number;
  errors: ImportIssue[];
  warnings: string[];
}

const FIELD_LABEL: Record<string, string> = {
  name: "name", slug: "handle", status: "status", department: "department", category: "category", garment: "garment",
  basePrice: "base_price", salePrice: "sale_price", saleStartsAt: "sale_starts", saleEndsAt: "sale_ends",
  fabric: "fabric", description: "description", colours: "colour/colour_hex", sizes: "size", variants: "sku/stock",
};

export function planImport(text: string, existing: Product[], nowIso: string, maxRows = 5000): ImportPlan {
  const plan: ImportPlan = { products: [], created: [], updated: [], variantCount: 0, errors: [], warnings: [] };
  const rows = parseCsv(text);
  if (rows.length < 2) {
    plan.errors.push({ row: 1, handle: "", message: "The file has no data rows." });
    return plan;
  }
  if (rows.length - 1 > maxRows) {
    plan.errors.push({ row: 1, handle: "", message: `Too many rows (${rows.length - 1}); the limit is ${maxRows} per import.` });
    return plan;
  }
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    plan.errors.push({ row: 1, handle: "", message: `Missing column(s): ${missing.join(", ")}.` });
    return plan;
  }
  const unknown = header.filter((h) => h && !(CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) plan.warnings.push(`Ignored unknown column(s): ${unknown.join(", ")}.`);

  const get = (r: string[], c: Col) => {
    const i = header.indexOf(c);
    return i >= 0 ? (r[i] ?? "").trim() : "";
  };

  // Group rows by handle, keeping file order
  const groups = new Map<string, { rows: { r: string[]; n: number }[] }>();
  rows.slice(1).forEach((r, i) => {
    const handle = get(r, "handle").toLowerCase();
    const n = i + 2;
    if (!handle) {
      plan.errors.push({ row: n, handle: "", message: "handle is empty." });
      return;
    }
    if (!groups.has(handle)) groups.set(handle, { rows: [] });
    groups.get(handle)!.rows.push({ r, n });
  });

  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  let pool = [...existing]; // existing + planned, for uniqueness checks
  let idSource: { id: string }[] = [...existing];

  for (const [handle, g] of groups) {
    const first = (c: Col) => g.rows.map(({ r }) => get(r, c)).find((v) => v !== "") ?? "";
    const current = bySlug.get(handle);

    const colours: Colour[] = [];
    const sizes: string[] = [];
    const variants: VariantInput[] = [];
    for (const { r, n } of g.rows) {
      const colour = get(r, "colour");
      const size = get(r, "size");
      if (!colour || !size) {
        plan.errors.push({ row: n, handle, message: "colour and size are required on every row." });
        continue;
      }
      let col = colours.find((c) => c.name.toLowerCase() === colour.toLowerCase());
      if (!col) {
        const hex = get(r, "colour_hex") || current?.colours.find((c) => c.name.toLowerCase() === colour.toLowerCase())?.hex || COLOUR_SWATCHES.find((c) => c.name.toLowerCase() === colour.toLowerCase())?.hex || "";
        col = { name: colour, hex };
        colours.push(col);
      }
      if (!sizes.includes(size)) sizes.push(size);
      if (variants.some((v) => v.colour.toLowerCase() === colour.toLowerCase() && v.size === size)) {
        plan.errors.push({ row: n, handle, message: `${colour} / ${size} appears twice.` });
        continue;
      }
      const sku = get(r, "sku");
      const stockRaw = get(r, "stock");
      // Blank stock keeps today's stock for that variant (so a price-only update can't zero inventory)
      const prev = current?.variants.find((v) => (sku && v.sku === sku.toUpperCase()) || (v.colour.toLowerCase() === colour.toLowerCase() && v.size === size));
      const stock = stockRaw === "" ? (prev?.stock ?? 0) : stockRaw;
      variants.push({ colour, size, sku: sku || prev?.sku, stock });
    }

    const input: ProductInput = {
      slug: handle,
      name: first("name"),
      status: (first("status") || current?.status || "active").toLowerCase(),
      department: first("department").toLowerCase(),
      category: first("category").toLowerCase(),
      garment: first("garment").toLowerCase(),
      basePrice: first("base_price"),
      salePrice: first("sale_price"),
      saleStartsAt: first("sale_starts").replace(" ", "T"),
      saleEndsAt: first("sale_ends").replace(" ", "T"),
      fabric: first("fabric") || current?.fabric || "",
      fit: first("fit") || current?.fit || "",
      description: first("description") || current?.description || "",
      care: first("care") || current?.care || [],
      tags: first("tags") || current?.tags || [],
      preOrderDispatch: first("pre_order_dispatch"),
      modelInfo: first("model_info") || current?.modelInfo,
      colours,
      sizes,
      variants,
    };

    const others = pool.filter((p) => p.slug !== handle && p.id !== current?.id);
    const newId = current?.id ?? nextProductId(idSource);
    const res = validateProduct(input, others, current, nowIso, newId);
    if (!res.ok) {
      for (const [field, msg] of Object.entries(res.errors)) {
        plan.errors.push({ row: g.rows[0].n, handle, message: `${FIELD_LABEL[field] ?? field}: ${msg}` });
      }
      continue;
    }
    plan.products.push(res.product);
    plan.variantCount += res.product.variants.length;
    (current ? plan.updated : plan.created).push(handle);
    pool = [...others, res.product];
    if (!current) idSource = [...idSource, res.product];
  }
  plan.errors.sort((a, b) => a.row - b.row);
  return plan;
}

export function productsToCsv(products: Product[]): string {
  const rows = products.flatMap((p) =>
    p.variants.map((v) => {
      const hex = p.colours.find((c) => c.name === v.colour)?.hex ?? "";
      const values: Record<Col, string | number | undefined> = {
        handle: p.slug,
        name: p.name,
        status: p.status,
        department: p.department,
        category: p.category,
        garment: p.garment,
        base_price: p.basePrice / 100,
        sale_price: p.sale ? p.sale.price / 100 : "",
        sale_starts: p.sale?.startsAt ? isoToPktLocal(p.sale.startsAt).replace("T", " ") : "",
        sale_ends: p.sale?.endsAt ? isoToPktLocal(p.sale.endsAt).replace("T", " ") : "",
        fabric: p.fabric,
        fit: p.fit,
        description: p.description,
        care: p.care.join(" | "),
        tags: p.tags.join(", "),
        pre_order_dispatch: p.preOrder?.dispatch ?? "",
        model_info: p.modelInfo ?? "",
        colour: v.colour,
        colour_hex: hex,
        size: v.size,
        sku: v.sku,
        stock: v.stock,
      };
      return CSV_COLUMNS.map((c) => values[c]);
    }),
  );
  return toCsv([...CSV_COLUMNS], rows);
}
