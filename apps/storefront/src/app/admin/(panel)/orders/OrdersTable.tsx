import Link from "next/link";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { formatPKR } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import { fmtDate } from "@/components/OrderView";
import { Badge, ORDER_TONE } from "../ui";

export function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="admin-table min-w-[720px]">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Customer</th>
            <th>City</th>
            <th>Payment</th>
            <th>Status</th>
            <th className="text-end">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.number} className="row-link">
              <td><Link href={`/admin/orders/${o.number}`} className="font-medium text-ink after:absolute after:inset-0">{o.number}</Link></td>
              <td className="whitespace-nowrap text-muted">{fmtDate(o.createdAt)}</td>
              <td>{o.address.name}<span className="block text-[12px] text-muted">{o.address.phone}</span></td>
              <td>{o.address.city}</td>
              <td><span className="text-[12px] font-medium uppercase tracking-wide text-muted">{o.payment === "cod" ? "COD" : "Bank"}</span></td>
              <td><Badge tone={ORDER_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge></td>
              <td className="text-end font-medium tabular-nums">{formatPKR(o.totals.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
