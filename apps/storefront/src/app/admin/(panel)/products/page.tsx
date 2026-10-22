import Link from "next/link";
import { categoryLabel, DEPARTMENTS, totalStock } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { formatPkt, saleState, type SaleState } from "@/lib/productPricing";
import { adminListProducts, requestTime } from "@/lib/server/store";
import type { ProductStatus } from "@/lib/types";
import { ProductPhoto } from "@/components/ProductPhoto";
import { BulkSale } from "./BulkSale";

const STATUS_TONE: Record<ProductStatus, string> = {
  active: "bg-emerald-100 text-emerald-900",
  draft: "bg-sand",
  archived: "bg-stone-200 text-muted",
};
const SALE_LABEL: Record<SaleState, string> = { none: "", live: "Sale live", scheduled: "Sale scheduled", ended: "Sale ended" };
const SALE_TONE: Record<SaleState, string> = { none: "", live: "text-sale", scheduled: "text-sky-800", ended: "text-muted" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim().toLowerCase();
  const dept = str("dept");
  const status = str("status");
  const saleFilter = str("sale");
  const all = await adminListProducts();
  const now = await requestTime();
  const products = all
    .filter((p) => (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q))))
    .filter((p) => !dept || p.department === dept)
    .filter((p) => (status ? p.status === status : p.status !== "archived"))
    .filter((p) => !saleFilter || saleState(p.sale, now) === saleFilter)
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));

  const counts = { active: 0, draft: 0, archived: 0 } as Record<ProductStatus, number>;
  all.forEach((p) => counts[p.status]++);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl">Products</h1>
          <p className="text-sm text-muted">{counts.active} active · {counts.draft} draft · {counts.archived} archived</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/products.csv" className="btn btn-secondary min-h-10 px-4">Export CSV</a>
          <Link href="/admin/products/import" className="btn btn-secondary min-h-10 px-4">Import CSV</Link>
          <Link href="/admin/products/new" className="btn btn-primary min-h-10 px-4">Add product</Link>
        </div>
      </div>

      <BulkSale />

      <section className="bg-white p-5">
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="Name, handle or SKU" className="field min-h-9 max-w-xs py-1 text-sm" aria-label="Search products" />
          <select name="dept" defaultValue={dept} className="field min-h-9 w-auto py-1 text-sm" aria-label="Department">
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
          </select>
          <select name="status" defaultValue={status} className="field min-h-9 w-auto py-1 text-sm" aria-label="Status">
            <option value="">Active & draft</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select name="sale" defaultValue={saleFilter} className="field min-h-9 w-auto py-1 text-sm" aria-label="Sale">
            <option value="">Any price</option>
            <option value="live">Sale live</option>
            <option value="scheduled">Sale scheduled</option>
            <option value="ended">Sale ended</option>
            <option value="none">No sale</option>
          </select>
          <button className="btn btn-secondary min-h-9 px-3">Filter</button>
          {(q || dept || status || saleFilter) && <Link href="/admin/products" className="self-center text-xs underline">Reset</Link>}
        </form>

        {products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-ink text-xs uppercase tracking-[0.1em] text-muted">
                  <th className="py-2 text-start font-normal">Product</th>
                  <th className="py-2 text-start font-normal">Department</th>
                  <th className="py-2 text-start font-normal">Status</th>
                  <th className="py-2 text-end font-normal">Price</th>
                  <th className="py-2 text-end font-normal">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = saleState(p.sale, now);
                  const stock = totalStock(p);
                  const soldOut = p.variants.filter((v) => v.stock === 0).length;
                  return (
                    <tr key={p.id} className="border-b border-line hover:bg-cream">
                      <td className="py-2">
                        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                          <ProductPhoto product={p} colour={p.colours[0]?.name} sizes="44px" className="h-14 w-11 shrink-0" />
                          <span>
                            <span className="block font-medium hover:underline">{p.name}</span>
                            <span className="text-xs text-muted">{p.id} · {p.variants.length} variants{p.preOrder ? " · pre-order" : ""}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-2 capitalize">{p.department}<br /><span className="text-xs normal-case text-muted">{categoryLabel(p)}</span></td>
                      <td className="py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[p.status]}`}>{p.status}</span></td>
                      <td className="py-2 text-end tabular-nums">
                        {st === "live" ? <><span className="text-sale">{formatPKR(p.price)}</span> <s className="text-xs text-muted">{formatPKR(p.basePrice)}</s></> : formatPKR(p.basePrice)}
                        {st !== "none" && (
                          <span className={`block text-xs ${SALE_TONE[st]}`}>
                            {SALE_LABEL[st]}
                            {st === "scheduled" && p.sale?.startsAt ? ` · ${formatPkt(p.sale.startsAt)}` : ""}
                            {st === "live" && p.sale?.endsAt ? ` · until ${formatPkt(p.sale.endsAt)}` : ""}
                            {st === "scheduled" && p.sale ? ` · ${formatPKR(p.sale.price)}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-end tabular-nums">
                        <span className={stock === 0 ? "text-sale" : ""}>{stock}</span>
                        {soldOut > 0 && <span className="block text-xs text-muted">{soldOut} sold out</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted">No products match. <Link href="/admin/products/new" className="underline">Add one</Link>.</p>
        )}
      </section>
    </div>
  );
}
