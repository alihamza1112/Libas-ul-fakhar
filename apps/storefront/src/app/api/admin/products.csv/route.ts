import { isAdmin } from "@/lib/server/adminAuth";
import { adminListProducts } from "@/lib/server/store";
import { productsToCsv } from "@/lib/productCsv";

// Catalogue export (FR-ADM-02). Also serves as the import template.
export async function GET() {
  if (!(await isAdmin())) return new Response("Not authorised", { status: 401 });
  const products = await adminListProducts();
  const date = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens UTF-8 (e.g. Urdu product names) correctly
  return new Response("﻿" + productsToCsv(products), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="libas-ul-fakhar-products-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
