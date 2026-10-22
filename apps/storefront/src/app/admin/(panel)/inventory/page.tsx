import { categoryLabel } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { adminListProducts } from "@/lib/server/store";
import { adjustStock } from "../../actions";

export default async function Inventory({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const low = sp.low === "1";
  const products = (await adminListProducts()).filter((p) => !q || p.name.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Inventory</h1>
        <form className="flex items-center gap-2">
          <input name="q" defaultValue={q} placeholder="Product or SKU" className="field min-h-9 py-1 text-sm" />
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="low" value="1" defaultChecked={low} /> Low / out only</label>
          <button className="btn btn-secondary min-h-9 px-3">Filter</button>
        </form>
      </div>
      {products.map((p) => {
        const variants = low ? p.variants.filter((v) => v.stock <= 2) : p.variants;
        if (!variants.length) return null;
        return (
          <section key={p.id} className="bg-white p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium font-sans">{p.name}</h2>
              <p className="text-xs text-muted">{p.department} · {categoryLabel(p)} · {formatPKR(p.price)}{p.compareAt ? ` (was ${formatPKR(p.compareAt)})` : ""}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {variants.map((v) => (
                <form key={v.sku} action={adjustStock} className="flex items-center gap-2 border border-line p-2 text-sm">
                  <input type="hidden" name="sku" value={v.sku} />
                  <span className="flex-1">
                    {v.colour} / {v.size}
                    <span className="block text-[11px] text-muted">{v.sku}</span>
                  </span>
                  <input name="qty" type="number" min={0} defaultValue={v.stock} className={`w-16 border px-2 py-1 text-end ${v.stock === 0 ? "border-sale text-sale" : v.stock <= 2 ? "border-gold" : "border-line"}`} aria-label={`Stock for ${v.sku}`} />
                  <button className="text-xs underline">Save</button>
                </form>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
