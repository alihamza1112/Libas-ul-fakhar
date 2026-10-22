import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { getOrder } from "@/lib/server/store";
import { fmtDate, OrderItems, OrderTimeline, OrderTotals } from "@/components/OrderView";
import { StatusControl } from "./StatusControl";

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[number]">) {
  const { number } = await params;
  const order = await getOrder(number);
  if (!order) notFound();
  const intlPhone = `92${order.address.phone.slice(1)}`;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm underline">← All orders</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl">Order {order.number}</h1>
        <p className="text-sm text-muted">Placed {fmtDate(order.createdAt)} · {STATUS_LABEL[order.status]} · {order.payment === "cod" ? "Cash on delivery" : "Bank transfer"}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="bg-white p-5">
            <h2 className="mb-3 text-xl">Items</h2>
            <OrderItems order={order} />
            <div className="mt-4 max-w-sm ms-auto"><OrderTotals order={order} /></div>
          </section>
          <section className="bg-white p-5">
            <h2 className="mb-3 text-xl">Update status</h2>
            <StatusControl number={order.number} status={order.status} />
          </section>
          <section className="bg-white p-5">
            <h2 className="mb-3 text-xl">History (audit trail)</h2>
            <OrderTimeline order={order} />
          </section>
        </div>
        <aside className="space-y-6">
          <section className="bg-white p-5 text-sm">
            <h2 className="mb-3 text-xl">Customer</h2>
            <p>{order.address.name}</p>
            <p>{order.address.phone}</p>
            {order.address.email && <p>{order.address.email}</p>}
            <p className="mt-3">{order.address.address}{order.address.area ? `, ${order.address.area}` : ""}</p>
            <p>{order.address.city}</p>
            {order.notes && <p className="mt-3 bg-cream p-2"><strong>Note:</strong> {order.notes}</p>}
            <a href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${order.address.name}, this is Libas-ul-Fakhar about your order ${order.number}.`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-4 w-full min-h-10">WhatsApp customer</a>
          </section>
        </aside>
      </div>
    </div>
  );
}
