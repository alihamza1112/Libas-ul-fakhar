import { STATUS_LABEL } from "@/lib/orderStatus";
import { listOrders } from "@/lib/server/store";
import type { OrderStatus } from "@/lib/types";
import { Card, Empty, FilterPill, PageHeader } from "../ui";
import { OrdersTable } from "./OrdersTable";

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const filter = typeof sp.status === "string" ? (sp.status as OrderStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const orders = await listOrders();
  const shown = orders.filter((o) => (!filter || o.status === filter) && (!q || o.number.toLowerCase().includes(q) || o.address.phone.includes(q) || o.address.name.toLowerCase().includes(q)));
  const counts = orders.reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {});
  const withQ = (status?: string) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description={`${orders.length} order${orders.length === 1 ? "" : "s"} in total`} />

      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
          <div className="flex flex-wrap gap-1.5">
            <FilterPill href={withQ()} active={!filter}>All <span className="pill-count">{orders.length}</span></FilterPill>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).filter((s) => counts[s]).map((s) => (
              <FilterPill key={s} href={withQ(s)} active={filter === s}>{STATUS_LABEL[s]} <span className="pill-count">{counts[s]}</span></FilterPill>
            ))}
          </div>
          <form className="flex gap-2">
            {filter && <input type="hidden" name="status" value={filter} />}
            <input name="q" defaultValue={q} placeholder="Order no., phone or name" className="field w-56" aria-label="Search orders" />
            <button className="btn btn-secondary">Search</button>
          </form>
        </div>
        {shown.length ? (
          <OrdersTable orders={shown} />
        ) : orders.length ? (
          <Empty title="No orders match">Try another status or search term.</Empty>
        ) : (
          <Empty title="No orders yet">Place a test order on the storefront to see it here.</Empty>
        )}
      </Card>
    </div>
  );
}
