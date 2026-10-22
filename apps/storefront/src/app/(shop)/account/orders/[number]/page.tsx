import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerCanCancel } from "@/lib/orderStatus";
import { orderFor, requireCustomer } from "@/lib/server/customers";
import { eta, fmtDate, OrderItems, OrderTimeline, OrderTotals } from "@/components/OrderView";
import { AccountShell } from "../../AccountShell";
import { OrderActions } from "./OrderActions";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const me = await requireCustomer(`/account/orders/${number}`);
  const order = await orderFor(me, number);
  if (!order) notFound();

  return (
    <AccountShell customer={me} active="orders" title={`Order ${order.number}`} crumbs={[["My account", "/account"], ["Orders", "/account/orders"], [order.number]]}>
      <p className="-mt-4 mb-6 text-sm text-muted">Placed {fmtDate(order.createdAt)} · {order.payment === "cod" ? "Cash on delivery" : "Bank transfer"} · delivery to {order.address.city} in {eta(order)}</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="bg-white p-5">
            <h2 className="mb-4 text-2xl">Status</h2>
            <OrderTimeline order={order} />
          </section>
          <section className="bg-white p-5">
            <h2 className="mb-2 text-2xl">Items</h2>
            <OrderItems order={order} />
            <div className="ms-auto mt-4 max-w-sm"><OrderTotals order={order} /></div>
          </section>
        </div>
        <aside className="h-fit space-y-4">
          <section className="bg-white p-5 text-sm">
            <h2 className="mb-2 text-xl">Delivery address</h2>
            <p>{order.address.name}<br />{order.address.address}{order.address.area ? `, ${order.address.area}` : ""}<br />{order.address.city}<br />{order.address.phone}</p>
          </section>
          <OrderActions number={order.number} canCancel={customerCanCancel(order.status)} delivered={order.status === "delivered"} items={order.items.map((i) => ({ productId: i.productId, sku: i.sku, qty: i.qty }))} />
        </aside>
      </div>
    </AccountShell>
  );
}
