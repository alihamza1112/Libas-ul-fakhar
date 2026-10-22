import Link from "next/link";
import { CSV_COLUMNS } from "@/lib/productCsv";
import { ImportForm } from "./ImportForm";

const COLUMN_HELP: [string, string][] = [
  ["handle", "Product URL handle, e.g. noor-kurta-men. Matches an existing product to update it; otherwise creates one. Required."],
  ["name, department, category, garment", "Required for new products. department: men / women / boys / girls. category: e.g. kurta, shalwar-kameez, shirts. garment: image style (kurta, kameez, shirt…)."],
  ["status", "active, draft or archived (default: active, or the current status when updating)."],
  ["base_price, sale_price", "Whole rupees, e.g. 5490. Leave sale_price empty for no sale."],
  ["sale_starts, sale_ends", "Pakistan time, YYYY-MM-DD HH:mm. Optional."],
  ["care, tags", "Separate items with | (care) or commas (tags)."],
  ["colour, colour_hex, size", "One row per colour × size. colour_hex is optional for standard colours (Ivory, Black, Navy…)."],
  ["sku, stock", "Empty SKU is generated. Empty stock keeps the current stock for that variant."],
];

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm underline">← Products</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Import products from CSV</h1>
          <p className="text-sm text-muted">One row per variant. Product details only need to be on each product’s first row.</p>
        </div>
        <a href="/api/admin/products.csv" className="btn btn-secondary min-h-10 px-4">Download current catalogue as template</a>
      </div>

      <ImportForm />

      <details className="bg-white p-6 text-sm">
        <summary className="cursor-pointer font-display text-xl">Column reference</summary>
        <p className="mt-3 font-mono text-xs text-muted">{CSV_COLUMNS.join(",")}</p>
        <dl className="mt-4 space-y-3">
          {COLUMN_HELP.map(([k, v]) => (
            <div key={k}><dt className="font-mono text-xs">{k}</dt><dd className="text-ink-soft">{v}</dd></div>
          ))}
        </dl>
      </details>
    </div>
  );
}
