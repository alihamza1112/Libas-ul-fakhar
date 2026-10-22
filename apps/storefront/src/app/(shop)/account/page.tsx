import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/orderStatus";
import { formatPKR } from "@/lib/pricing";
import { ordersFor, requireCustomer } from "@/lib/server/customers";
import { fmtDate } from "@/components/OrderView";
import { AccountShell, displayName } from "./AccountShell";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const me = await requireCustomer("/account");
  const sp = await searchParams;
  const orders = await ordersFor(me);
  const open = orders.filter((o) => !["delivered", "cancelled", "refunded", "returned"].includes(o.status));
  const address = me.addresses.find((a) => a.isDefault) ?? me.addresses[0];

  return (
    <AccountShell customer={me} active="overview" title={`Assalam-o-Alaikum, ${displayName(me)}`}>
      {sp.welcome === "1" && <p className="mb-6 bg-emerald-50 p-4 text-sm text-success" role="status">Welcome to Libas-ul-Fakhar! Your account is ready{orders.length ? `, and we found ${orders.length} earlier order${orders.length > 1 ? "s" : ""} placed with this number` : ""}.</p>}
      {!me.phone && (
        <p className="mb-6 bg-amber-50 p-4 text-sm">
          Add your mobile number to see orders you placed as a guest and to speed up checkout. <Link href="/account/profile#phone" className="underline">Add number</Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Open orders", String(open.length), "/account/orders"],
          ["All orders", String(orders.length), "/account/orders"],
          ["Saved for later", String(me.wishlist.length), "/wishlist"],
        ].map(([k, v, href]) => (
          <Link key={k} href={href} className="bg-white p-5 hover:shadow-md">
            <p className="eyebrow">{k}</p>
            <p className="mt-1 font-display text-4xl">{v}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-2xl">Recent orders</h2>
          <Link href="/account/orders" className="text-xs uppercase tracking-[0.14em] underline">View all</Link>
        </div>
        {orders.length ? (
          <ul className="divide-y divide-line">
            {orders.slice(0, 3).map((o) => (
              <li key={o.number}>
                <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-cream">
                  <span><span className="font-medium">{o.number}</span><span className="block text-xs text-muted">{fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)</span></span>
                  <span className="text-end text-sm">{formatPKR(o.totals.total)}<span className="block text-xs text-muted">{STATUS_LABEL[o.status]}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No orders yet. <Link href="/collections/new-arrivals" className="underline">Start shopping</Link>.</p>
        )}
      </section>

      <section className="mt-6 bg-white p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-2xl">Default address</h2>
          <Link href="/account/addresses" className="text-xs uppercase tracking-[0.14em] underline">Manage</Link>
        </div>
        {address ? (
          <p className="text-sm">{address.name}<br />{address.address}{address.area ? `, ${address.area}` : ""}<br />{address.city} · {address.phone}</p>
        ) : (
          <p className="text-sm text-muted">No saved addresses. Add one now, or tick “save this address” at checkout.</p>
        )}
      </section>
    </AccountShell>
  );
}
