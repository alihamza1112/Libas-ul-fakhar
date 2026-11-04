import { notFound } from "next/navigation";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { getOrder } from "@/lib/server/store";
import { fmtDate, OrderItems, OrderTimeline, OrderTotals } from "@/components/OrderView";
import { WhatsAppIcon } from "@/components/Icons";
import { Badge, Card, ORDER_TONE, PageHeader } from "../../ui";
import { StatusControl } from "./StatusControl";

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[number]">) {
  const { number } = await params;
  const order = await getOrder(number);
  if (!order) notFound();
  const intlPhone = `92${order.address.phone.slice(1)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/orders", label: "All orders" }}
        title={`Order ${order.number}`}
        description={<>Placed {fmtDate(order.createdAt)} · {order.payment === "cod" ? "Cash on delivery" : "Bank transfer"}</>}
        actions={<Badge tone={ORDER_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Items">
            <OrderItems order={order} />
            <div className="mt-4 max-w-sm border-t border-[var(--admin-line)] pt-4 ms-auto"><OrderTotals order={order} /></div>
          </Card>
          <Card title="Update status">
            <StatusControl number={order.number} status={order.status} />
          </Card>
          <Card title="History">
            <OrderTimeline order={order} />
          </Card>
        </div>
        <aside className="space-y-6">
          <Card title="Customer">
            <dl className="space-y-4 text-[13px]">
              <div>
                <dt className="text-[12px] text-muted">Contact</dt>
                <dd className="mt-0.5 font-medium">{order.address.name}</dd>
                <dd>{order.address.phone}</dd>
                {order.address.email && <dd className="break-all">{order.address.email}</dd>}
              </div>
              <div>
                <dt className="text-[12px] text-muted">Delivery address</dt>
                <dd className="mt-0.5">{order.address.address}{order.address.area ? `, ${order.address.area}` : ""}</dd>
                <dd>{order.address.city}</dd>
              </div>
              {order.notes && (
                <div>
                  <dt className="text-[12px] text-muted">Customer note</dt>
                  <dd className="mt-1 rounded-lg bg-[var(--admin-hover)] p-3">{order.notes}</dd>
                </div>
              )}
            </dl>
            <a href={`https://wa.me/${intlPhone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${order.address.name}, this is Libas-ul-Fakhar about your order ${order.number}.`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary mt-5 w-full">
              <WhatsAppIcon width={16} height={16} className="text-[#1f7a4d]" /> WhatsApp customer
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}
