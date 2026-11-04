import { CSV_COLUMNS } from "@/lib/productCsv";
import { ImportForm } from "./ImportForm";
import { PageHeader } from "../../ui";

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
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="Import products from CSV"
        description="One row per variant. Product details only need to be on each product’s first row."
        actions={<a href="/api/admin/products.csv" className="btn btn-secondary">Download template</a>}
      />

      <ImportForm />

      <details className="card disclosure text-[13px]">
        <summary>Column reference</summary>
        <div className="border-t border-[var(--admin-line)] px-5 py-4">
          <p className="rounded-md bg-[var(--admin-hover)] p-3 font-mono text-[11px] text-muted">{CSV_COLUMNS.join(",")}</p>
          <dl className="mt-4 divide-y divide-[var(--admin-line)]">
            {COLUMN_HELP.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr]"><dt className="font-mono text-[12px]">{k}</dt><dd className="text-ink-soft">{v}</dd></div>
            ))}
          </dl>
        </div>
      </details>
    </div>
  );
}
