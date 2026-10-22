import Link from "next/link";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { formatPKR } from "@/lib/pricing";
import { adminListProducts, listOrders } from "@/lib/server/store";
import type { OrderStatus } from "@/lib/types";
import { fmtDate } from "@/components/OrderView";

const STATUS_TONE: Partial<Record<OrderStatus, string>> = {
  pending: "bg-sand",
  confirmed: "bg-sky-100",
  packed: "bg-sky-100",
  shipped: "bg-indigo-100",
  out_for_delivery: "bg-indigo-100",
  delivered: "bg-emerald-100",
  cancelled: "bg-stone-200 text-muted",
  failed_delivery: "bg-rose-100",
  return_requested: "bg-amber-100",
};

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const filter = typeof sp.status === "string" ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const orders = await listOrders();
  const live = orders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + o.totals.total, 0);
  const aov = live.length ? revenue / live.length : 0;
  const cod = live.filter((o) => o.payment === "cod").length;

  const units = new Map<string, number>();
  const names = new Map<string, string>();
  for (const o of live) for (const it of o.items) {
    units.set(it.productId, (units.get(it.productId) ?? 0) + it.qty);
    names.set(it.productId, it.name);
  }
  const top = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const lowStock = (await adminListProducts()).filter((p) => p.status === "active").flatMap((p) => p.variants.filter((v) => v.stock > 0 && v.stock <= 2).map((v) => ({ p, v }))).slice(0, 8);

  const shown = orders.filter((o) => (!filter || o.status === filter) && (!q || o.number.toLowerCase().includes(q) || o.address.phone.includes(q) || o.address.name.toLowerCase().includes(q)));
  const counts = orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["Revenue (excl. cancelled)", formatPKR(revenue)],
          ["Orders", String(live.length)],
          ["Average order value", formatPKR(aov)],
          ["COD vs prepaid", `${cod} / ${live.length - cod}`],
        ].map(([k, v]) => (
          <div key={k} className="bg-white p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{k}</p>
            <p className="mt-2 text-2xl font-medium tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">Orders</h2>
            <form className="flex gap-2">
              {filter && <input type="hidden" name="status" value={filter} />}
              <input name="q" defaultValue={q} placeholder="Order no., phone, name" className="field min-h-9 py-1 text-sm" />
              <button className="btn btn-secondary min-h-9 px-3">Search</button>
            </form>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <Link href="/admin" className={`rounded-full border px-3 py-1 ${!filter ? "border-ink bg-ink text-ivory" : "border-line"}`}>All ({orders.length})</Link>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).filter((s) => counts[s]).map((s) => (
              <Link key={s} href={`/admin?status=${s}`} className={`rounded-full border px-3 py-1 ${filter === s ? "border-ink bg-ink text-ivory" : "border-line"}`}>{STATUS_LABEL[s]} ({counts[s]})</Link>
            ))}
          </div>
          {shown.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-ink text-start text-xs uppercase tracking-[0.1em] text-muted">
                    <th className="py-2 text-start font-normal">Order</th>
                    <th className="py-2 text-start font-normal">Date</th>
                    <th className="py-2 text-start font-normal">Customer</th>
                    <th className="py-2 text-start font-normal">City</th>
                    <th className="py-2 text-start font-normal">Payment</th>
                    <th className="py-2 text-end font-normal">Total</th>
                    <th className="py-2 text-start font-normal ps-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((o) => (
                    <tr key={o.number} className="border-b border-line hover:bg-cream">
                      <td className="py-2"><Link href={`/admin/orders/${o.number}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link></td>
                      <td className="py-2 text-muted">{fmtDate(o.createdAt)}</td>
                      <td className="py-2">{o.address.name}<br /><span className="text-xs text-muted">{o.address.phone}</span></td>
                      <td className="py-2">{o.address.city}</td>
                      <td className="py-2 uppercase">{o.payment}</td>
                      <td className="py-2 text-end tabular-nums">{formatPKR(o.totals.total)}</td>
                      <td className="py-2 ps-4"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[o.status] ?? "bg-sand"}`}>{STATUS_LABEL[o.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">No orders yet. Place a test order on the storefront to see it here.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="bg-white p-5">
            <h2 className="mb-3 text-xl">Top products</h2>
            {top.length ? (
              <ol className="space-y-2 text-sm">
                {top.map(([id, n]) => <li key={id} className="flex justify-between gap-2"><Link href={`/admin/products/${id}`} className="hover:underline">{names.get(id)}</Link><span className="text-muted">{n} sold</span></li>)}
              </ol>
            ) : <p className="text-sm text-muted">No sales yet.</p>}
          </section>
          <section className="bg-white p-5">
            <h2 className="mb-3 text-xl">Low stock</h2>
            <ul className="space-y-2 text-sm">
              {lowStock.map(({ p, v }) => <li key={v.sku} className="flex justify-between gap-2"><span>{p.name} <span className="text-xs text-muted">({v.colour}/{v.size})</span></span><span className="text-sale">{v.stock}</span></li>)}
            </ul>
            <Link href="/admin/inventory" className="mt-3 inline-block text-xs underline">Manage inventory</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
