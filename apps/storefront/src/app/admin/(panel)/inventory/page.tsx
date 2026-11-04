import Link from "next/link";
import { categoryLabel } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { adminListProducts } from "@/lib/server/store";
import { adjustStock } from "../../actions";
import { Card, Empty, PageHeader } from "../ui";

export default async function Inventory({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const low = sp.low === "1";
  const products = (await adminListProducts())
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q)))
    .map((p) => ({ p, variants: low ? p.variants.filter((v) => v.stock <= 2) : p.variants }))
    .filter((x) => x.variants.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Set stock per colour and size. Changes apply to the store straight away." />

      <Card flush>
        <form className="flex flex-wrap items-center gap-3 px-5 py-4">
          <input name="q" defaultValue={q} placeholder="Search product or SKU" className="field w-full sm:w-64" aria-label="Search inventory" />
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" name="low" value="1" defaultChecked={low} className="checkbox" /> Low or out of stock only
          </label>
          <button className="btn btn-secondary">Apply</button>
          {(q || low) && <Link href="/admin/inventory" className="px-2 text-[13px] text-muted hover:text-ink">Reset</Link>}
        </form>
      </Card>

      {products.length ? products.map(({ p, variants }) => (
        <Card
          key={p.id}
          title={p.name}
          action={<span className="text-[12px] capitalize text-muted">{p.department} · {categoryLabel(p)} · {formatPKR(p.price)}{p.compareAt ? <s className="ms-1">{formatPKR(p.compareAt)}</s> : null}</span>}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
            {variants.map((v) => {
              const tone = v.stock === 0 ? "stock-out" : v.stock <= 2 ? "stock-low" : "";
              return (
                <form key={v.sku} action={adjustStock} className={`stock-row ${tone}`}>
                  <input type="hidden" name="sku" value={v.sku} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{v.colour} · {v.size}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{v.sku}</span>
                  </span>
                  <input name="qty" type="number" min={0} defaultValue={v.stock} className="field w-[72px] text-end tabular-nums" aria-label={`Stock for ${v.sku}`} />
                  <button className="btn btn-secondary btn-sm">Save</button>
                </form>
              );
            })}
          </div>
        </Card>
      )) : (
        <Card><Empty title="Nothing to show">{low ? "No variants are low or out of stock." : "No products match your search."}</Empty></Card>
      )}
    </div>
  );
}
