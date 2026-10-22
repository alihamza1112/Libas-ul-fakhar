import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getOrder } from "@/lib/server/store";
import { formatPKR } from "@/lib/pricing";
import { whatsappLink } from "@/lib/site";
import { getCustomer } from "@/lib/server/customers";
import { eta, OrderItems, OrderTimeline, OrderTotals } from "@/components/OrderView";
import { WhatsAppIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function OrderPage({ params }: PageProps<"/order/[number]">) {
  const { number } = await params;
  const mine = ((await cookies()).get("luf_orders")?.value ?? "").split(".");
  const order = mine.includes(number) ? await getOrder(number) : undefined;
  const signedIn = !!(await getCustomer());

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-4xl">Order {number}</h1>
        <p className="mt-3 text-muted">To view this order, enter your order number and mobile number on the tracking page.</p>
        <Link href={`/track?order=${encodeURIComponent(number)}`} className="btn btn-primary mt-6">Track your order</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="texture mb-10 p-8 text-center">
        <p className="eyebrow">Shukriya, {order.address.name.split(" ")[0]}</p>
        <h1 className="mt-2 text-4xl md:text-5xl">Your order is placed</h1>
        <p className="mt-3 text-sm">Order number <strong className="tracking-wider">{order.number}</strong></p>
        <p className="mt-1 text-sm text-ink-soft">Estimated delivery to {order.address.city}: {eta(order)}</p>
      </div>

      {order.payment === "cod" ? (
        <p className="mb-8 bg-white p-4 text-sm">
          Please keep <strong>{formatPKR(order.totals.total)}</strong> ready in cash. Our team may call or WhatsApp you on <strong>{order.address.phone}</strong> to confirm before dispatch.
        </p>
      ) : (
        <div className="mb-8 space-y-1 bg-white p-4 text-sm">
          <p className="font-medium">Bank transfer details</p>
          <p>Account title: Libas-ul-Fakhar · Bank: (to be configured) · IBAN: PK00 XXXX 0000 0000 0000 0000</p>
          <p>Amount: <strong>{formatPKR(order.totals.total)}</strong> · Reference: <strong>{order.number}</strong></p>
          <p className="text-muted">Send the receipt on WhatsApp — we dispatch once payment is confirmed.</p>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-2xl">Items</h2>
          <OrderItems order={order} />
          <div className="mt-4"><OrderTotals order={order} /></div>
        </section>
        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-2xl">Delivering to</h2>
            <p className="text-sm">{order.address.name}<br />{order.address.address}{order.address.area ? `, ${order.address.area}` : ""}<br />{order.address.city}<br />{order.address.phone}</p>
          </div>
          <div>
            <h2 className="mb-3 text-2xl">Status</h2>
            <OrderTimeline order={order} />
          </div>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">Continue shopping</Link>
        <a href={whatsappLink(`Assalam-o-Alaikum, I have a question about order ${order.number}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary"><WhatsAppIcon /> Questions? WhatsApp us</a>
      </div>
      {signedIn ? (
        <p className="mt-8 text-center text-sm text-muted">You can follow this order any time in <Link href="/account/orders" className="underline">your orders</Link>.</p>
      ) : (
        <div className="mt-8 bg-white p-5 text-center text-sm">
          <p className="font-medium">Track this order and check out faster next time</p>
          <p className="mt-1 text-muted">Sign in with {order.address.phone} — this order will be in your account automatically.</p>
          <Link href="/account/login?next=/account/orders" className="btn btn-secondary mt-3">Create account</Link>
        </div>
      )}
    </div>
  );
}
