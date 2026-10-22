import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { formatPKR } from "@/lib/pricing";
import { ordersFor, requireCustomer } from "@/lib/server/customers";
import { fmtDate } from "@/components/OrderView";
import { ProductArt } from "@/components/ProductArt";
import { AccountShell } from "../AccountShell";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const me = await requireCustomer("/account/orders");
  const orders = await ordersFor(me);
  return (
    <AccountShell customer={me} active="orders" title="My orders">
      {orders.length ? (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.number}>
              <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center gap-4 bg-white p-4 hover:shadow-md">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((it) =>
                    it.image ? (
                      <span key={it.sku} className="relative h-16 w-13 overflow-hidden border-2 border-white bg-cream"><Image src={it.image} alt="" fill sizes="52px" className="object-cover" /></span>
                    ) : (
                      <span key={it.sku} className="border-2 border-white">{it.garment ? <ProductArt garment={it.garment} hex={it.hex ?? "#D8C3A5"} className="h-16 w-13" /> : <span className="block h-16 w-13 bg-cream" />}</span>
                    ),
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{o.number}</p>
                  <p className="truncate text-xs text-muted">{fmtDate(o.createdAt)} · {o.items.map((i) => i.name).join(", ")}</p>
                </div>
                <div className="text-end">
                  <p className="text-sm">{formatPKR(o.totals.total)}</p>
                  <p className={`text-xs ${o.status === "cancelled" ? "text-muted" : o.status === "delivered" ? "text-success" : "text-gold"}`}>{STATUS_LABEL[o.status]}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white p-10 text-center">
          <p className="font-display text-2xl">No orders yet</p>
          <p className="mt-2 text-sm text-muted">Orders you place while signed in{me.phone ? ", or as a guest with this mobile number," : ""} appear here.</p>
          <Link href="/collections/new-arrivals" className="btn btn-primary mt-6">Start shopping</Link>
        </div>
      )}
    </AccountShell>
  );
}
