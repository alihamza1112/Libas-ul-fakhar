import Link from "next/link";
import { formatPKR } from "@/lib/pricing";
import { adminListProducts, listOrders } from "@/lib/server/store";
import { Card, Empty, PageHeader, StatCard } from "./ui";
import { OrdersTable } from "./orders/OrdersTable";

export default async function AdminDashboard() {
  const orders = await listOrders();
  const live = orders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + o.totals.total, 0);
  const aov = live.length ? revenue / live.length : 0;
  const cod = live.filter((o) => o.payment === "cod").length;
  const awaiting = orders.filter((o) => o.status === "pending").length;

  const units = new Map<string, number>();
  const names = new Map<string, string>();
  for (const o of live) for (const it of o.items) {
    units.set(it.productId, (units.get(it.productId) ?? 0) + it.qty);
    names.set(it.productId, it.name);
  }
  const top = [...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const lowStock = (await adminListProducts()).filter((p) => p.status === "active").flatMap((p) => p.variants.filter((v) => v.stock > 0 && v.stock <= 2).map((v) => ({ p, v }))).slice(0, 8);
  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales and stock at a glance."
        actions={<Link href="/admin/products/new" className="btn btn-primary">Add product</Link>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatPKR(revenue)} hint="Excludes cancelled orders" />
        <StatCard label="Orders" value={String(live.length)} hint={awaiting ? `${awaiting} awaiting confirmation` : "All caught up"} />
        <StatCard label="Average order value" value={formatPKR(aov)} />
        <StatCard label="COD / prepaid" value={`${cod} / ${live.length - cod}`} hint="Cash on delivery vs bank transfer" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="Recent orders" flush action={<Link href="/admin/orders" className="text-[13px] font-medium text-muted transition-colors hover:text-ink">View all →</Link>}>
          {recent.length ? <OrdersTable orders={recent} /> : <Empty title="No orders yet">Place a test order on the storefront to see it here.</Empty>}
        </Card>

        <div className="space-y-6">
          <Card title="Top products">
            {top.length ? (
              <ol className="space-y-3 text-[13px]">
                {top.map(([id, n], i) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--admin-hover)] text-[11px] font-medium text-muted">{i + 1}</span>
                    <Link href={`/admin/products/${id}`} className="flex-1 truncate hover:underline">{names.get(id)}</Link>
                    <span className="text-muted tabular-nums">{n} sold</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-[13px] text-muted">No sales yet.</p>}
          </Card>
          <Card title="Low stock" action={<Link href="/admin/inventory?low=1" className="text-[13px] font-medium text-muted transition-colors hover:text-ink">Manage →</Link>}>
            {lowStock.length ? (
              <ul className="divide-y divide-[var(--admin-line)] text-[13px]">
                {lowStock.map(({ p, v }) => (
                  <li key={v.sku} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="block truncate">{p.name}</span>
                      <span className="text-[12px] text-muted">{v.colour} · {v.size}</span>
                    </span>
                    <span className="badge badge-danger tabular-nums">{v.stock} left</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[13px] text-muted">Nothing running low.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
