"use client";

import Link from "next/link";
import { computeTotals } from "@/lib/pricing";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CartLineRow, FreeShippingBar } from "@/components/CartDrawer";
import { CouponField, CouponHints, TotalsTable } from "@/components/OrderSummary";
import { useStore } from "@/components/StoreProvider";
import { CashIcon, ReturnIcon, ShieldIcon } from "@/components/Icons";

export default function CartPage() {
  const { lines, ready, coupon } = useStore();
  const totals = computeTotals(lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })), { coupon });

  return (
    <div className="mx-auto max-w-6xl px-4">
      <Breadcrumbs items={[["Shopping bag"]]} />
      <h1 className="mb-8 text-4xl">Shopping bag</h1>
      {!ready ? (
        <div className="h-60 animate-pulse bg-cream" />
      ) : lines.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-3xl">Your bag is empty</p>
          <p className="mt-2 text-sm text-muted">Pieces you add will appear here.</p>
          <Link href="/collections/new-arrivals" className="btn btn-primary mt-6">Continue shopping</Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <FreeShippingBar subtotal={totals.subtotal - totals.discount} />
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {lines.map((l) => <CartLineRow key={l.sku} l={l} />)}
            </ul>
            <Link href="/collections/all" className="mt-4 inline-block text-sm underline underline-offset-4">Continue shopping</Link>
          </div>
          <aside className="h-fit space-y-5 bg-white p-6 lg:sticky lg:top-28">
            <h2 className="text-2xl">Order summary</h2>
            <CouponField />
            <CouponHints />
            <TotalsTable totals={totals} cityKnown={false} />
            <Link href="/checkout" className="btn btn-primary w-full">Proceed to checkout</Link>
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex items-center gap-2"><CashIcon width={18} /> Cash on delivery across Pakistan</li>
              <li className="flex items-center gap-2"><ReturnIcon width={18} /> 7-day exchange & returns</li>
              <li className="flex items-center gap-2"><ShieldIcon width={18} /> Secure checkout · no card data stored</li>
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
