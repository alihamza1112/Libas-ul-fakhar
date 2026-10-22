"use server";

import { revalidatePath, updateTag } from "next/cache";
import { DEPARTMENTS } from "@/lib/catalog";
import { requireAdmin } from "@/lib/server/adminAuth";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { bulkSale, importProducts, saveProduct } from "@/lib/server/store";
import { pktLocalToIso } from "@/lib/productPricing";
import type { FieldErrors, ProductInput } from "@/lib/productInput";
import type { ImportPlan } from "@/lib/productCsv";
import type { DepartmentSlug } from "@/lib/types";

function catalogChanged(productId?: string) {
  updateTag(CATALOG_TAG); // storefront sees the change on the next request
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

export async function saveProductAction(input: ProductInput): Promise<{ ok: true; id: string } | { ok: false; errors: FieldErrors }> {
  await requireAdmin();
  const res = await saveProduct(input, "admin");
  if (!res.ok) return res;
  catalogChanged(res.product.id);
  return { ok: true, id: res.product.id };
}

export interface BulkSaleState {
  error?: string;
  message?: string;
}

export async function bulkSaleAction(_: BulkSaleState, fd: FormData): Promise<BulkSaleState> {
  await requireAdmin();
  const department = String(fd.get("department") ?? "all") as DepartmentSlug | "all";
  const category = String(fd.get("category") ?? "") || undefined;
  const clear = fd.get("intent") === "clear";
  const percent = clear ? 0 : Number(fd.get("percent"));
  const startsRaw = String(fd.get("startsAt") ?? "");
  const endsRaw = String(fd.get("endsAt") ?? "");
  const startsAt = startsRaw ? pktLocalToIso(startsRaw) : undefined;
  const endsAt = endsRaw ? pktLocalToIso(endsRaw) : undefined;

  if (department !== "all" && !DEPARTMENTS.some((d) => d.slug === department)) return { error: "Choose a department." };
  if (category && department === "all") return { error: "Pick a department to sale a single category." };
  if (!clear) {
    if (!Number.isInteger(percent) || percent < 1 || percent > 90) return { error: "Discount must be a whole number from 1 to 90%." };
    if ((startsRaw && !startsAt) || (endsRaw && !endsAt)) return { error: "Invalid date." };
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return { error: "The sale must end after it starts." };
  }
  const n = await bulkSale({ department, category, percent, startsAt, endsAt }, "admin");
  catalogChanged();
  return { message: clear ? `Sale cleared on ${n} products.` : `${percent}% sale set on ${n} products.` };
}

export interface ImportState {
  plan?: ImportPlan;
  applied?: boolean;
  error?: string;
  csv?: string;
  fileName?: string;
}

const MAX_BYTES = 2 * 1024 * 1024;

export async function importAction(prev: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const intent = fd.get("intent");
  if (intent === "reset") return {};
  let csv: string;
  let fileName = prev.fileName;
  if (intent === "apply") {
    csv = String(fd.get("csv") ?? "");
  } else {
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
    if (file.size > MAX_BYTES) return { error: "File is larger than 2 MB. Split it into smaller imports." };
    if (!/\.csv$/i.test(file.name)) return { error: "Upload a .csv file (in Excel: File → Save As → CSV UTF-8)." };
    csv = await file.text();
    fileName = file.name;
  }
  if (!csv.trim()) return { error: "The file is empty." };

  const apply = intent === "apply";
  const plan = await importProducts(csv, apply, "admin");
  if (apply && !plan.errors.length) {
    catalogChanged();
    return { plan, applied: true, fileName };
  }
  return { plan, csv, fileName };
}
