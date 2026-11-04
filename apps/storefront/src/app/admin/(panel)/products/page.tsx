import Link from "next/link";
import { categoryLabel, DEPARTMENTS, totalStock } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { formatPkt, saleState, type SaleState } from "@/lib/productPricing";
import { adminListProducts, requestTime } from "@/lib/server/store";
import type { ProductStatus } from "@/lib/types";
import { ProductPhoto } from "@/components/ProductPhoto";
import { Badge, Card, Empty, PageHeader, PRODUCT_TONE } from "../ui";
import { BulkSale } from "./BulkSale";
const SALE_LABEL: Record<SaleState, string> = { none: "", live: "Sale live", scheduled: "Sale scheduled", ended: "Sale ended" };
const SALE_TONE: Record<SaleState, string> = { none: "", live: "text-sale", scheduled: "text-sky-700", ended: "text-muted" };

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
      <PageHeader
        title="Products"
        description={`${counts.active} active · ${counts.draft} draft · ${counts.archived} archived`}
        actions={
          <>
            <a href="/api/admin/products.csv" className="btn btn-secondary">Export CSV</a>
            <Link href="/admin/products/import" className="btn btn-secondary">Import CSV</Link>
            <Link href="/admin/products/new?type=gift" className="btn btn-secondary">Add gift box</Link>
            <Link href="/admin/products/new" className="btn btn-primary">Add product</Link>
          </>
        }
      />

      <BulkSale />

      <Card flush>
        <form className="flex flex-wrap items-center gap-2 border-b border-[var(--admin-line)] px-5 py-4">
          <input name="q" defaultValue={q} placeholder="Search name, handle or SKU" className="field w-full sm:w-64" aria-label="Search products" />
          <select name="dept" defaultValue={dept} className="field w-auto" aria-label="Department">
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
          </select>
          <select name="status" defaultValue={status} className="field w-auto" aria-label="Status">
            <option value="">Active & draft</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select name="sale" defaultValue={saleFilter} className="field w-auto" aria-label="Sale">
            <option value="">Any price</option>
            <option value="live">Sale live</option>
            <option value="scheduled">Sale scheduled</option>
            <option value="ended">Sale ended</option>
            <option value="none">No sale</option>
          </select>
          <button className="btn btn-secondary">Apply filters</button>
          {(q || dept || status || saleFilter) && <Link href="/admin/products" className="px-2 text-[13px] text-muted hover:text-ink">Reset</Link>}
          <span className="ms-auto text-[12px] text-muted">{products.length} shown</span>
        </form>

        {products.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-[760px]">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Stock</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const st = saleState(p.sale, now);
                  const stock = totalStock(p);
                  const soldOut = p.variants.filter((v) => v.stock === 0).length;
                  return (
                    <tr key={p.id} className="row-link">
                      <td>
                        <div className="flex items-center gap-3">
                          <ProductPhoto product={p} colour={p.colours[0]?.name} sizes="40px" className="h-12 w-10 shrink-0 overflow-hidden rounded-md" />
                          <span className="min-w-0">
                            <Link href={`/admin/products/${p.id}`} className="block font-medium text-ink after:absolute after:inset-0">{p.name}</Link>
                            <span className="text-[12px] text-muted">{p.variants.length} variants{p.preOrder ? " · pre-order" : ""}</span>
                          </span>
                        </div>
                      </td>
                      <td className="capitalize">{p.department}<span className="block text-[12px] normal-case text-muted">{categoryLabel(p)}</span></td>
                      <td><Badge tone={PRODUCT_TONE[p.status]}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge></td>
                      <td className="whitespace-nowrap text-end tabular-nums">
                        {st === "live" ? <><span className="font-medium text-sale">{formatPKR(p.price)}</span> <s className="ms-1 text-[12px] text-muted">{formatPKR(p.basePrice)}</s></> : formatPKR(p.basePrice)}
                        {st !== "none" && (
                          <span className={`block text-[12px] ${SALE_TONE[st]}`}>
                            {SALE_LABEL[st]}
                            {st === "scheduled" && p.sale?.startsAt ? ` · ${formatPkt(p.sale.startsAt)}` : ""}
                            {st === "live" && p.sale?.endsAt ? ` · until ${formatPkt(p.sale.endsAt)}` : ""}
                            {st === "scheduled" && p.sale ? ` · ${formatPKR(p.sale.price)}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="text-end tabular-nums">
                        <span className={stock === 0 ? "font-medium text-sale" : ""}>{stock}</span>
                        {soldOut > 0 && <span className="block text-[12px] text-muted">{soldOut} sold out</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No products match">
            Adjust the filters or <Link href="/admin/products/new" className="font-medium text-ink underline underline-offset-4">add a product</Link>.
          </Empty>
        )}
      </Card>
    </div>
  );
}
