"use client";

import Link from "next/link";
import { useEffect } from "react";
import { computeTotals, formatPKR, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { ProductPhoto } from "./ProductPhoto";
import { BagIcon, CloseIcon, MinusIcon, PlusIcon } from "./Icons";
import { useStore, type ResolvedLine } from "./StoreProvider";
import { useCatalog } from "./CatalogProvider";

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const left = FREE_SHIPPING_THRESHOLD - subtotal;
  const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return (
    <div>
      <p className="mb-2 text-xs">
        {left > 0 ? <>You are <strong>{formatPKR(left)}</strong> away from free delivery</> : <>You have unlocked <strong>free delivery</strong></>}
      </p>
      <div className="h-1 w-full bg-sand" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-1 bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartLineRow({ l, compact = false }: { l: ResolvedLine; compact?: boolean }) {
  const { setQty, remove } = useStore();
  const overStock = !l.product.preOrder && l.qty > l.variant.stock;
  return (
    <li className="flex gap-3 py-4">
      <Link href={`/products/${l.product.slug}`} className="shrink-0">
        <ProductPhoto product={l.product} colour={l.variant.colour} sizes="102px" className={compact ? "h-24 w-[76px]" : "h-32 w-[102px]"} />
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link href={`/products/${l.product.slug}`} className="text-sm leading-snug hover:underline">{l.product.name}</Link>
          <span className="text-sm whitespace-nowrap">{formatPKR(l.product.price * l.qty)}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">{l.variant.colour} · {l.variant.size}</p>
        {l.product.compareAt && <s className="text-xs text-muted">{formatPKR(l.product.compareAt * l.qty)}</s>}
        {l.product.preOrder && <p className="text-xs text-gold">Pre-order · dispatches in {l.product.preOrder.dispatch}</p>}
        {overStock && <p className="text-xs text-sale">{l.variant.stock === 0 ? "Sold out – please remove" : `Only ${l.variant.stock} available`}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center border border-line">
            <button className="grid h-8 w-8 place-items-center" aria-label="Decrease quantity" onClick={() => setQty(l.sku, l.qty - 1)}><MinusIcon width={14} /></button>
            <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">{l.qty}</span>
            <button className="grid h-8 w-8 place-items-center disabled:opacity-30" aria-label="Increase quantity" disabled={l.qty >= 10 || (!l.product.preOrder && l.qty >= l.variant.stock)} onClick={() => setQty(l.sku, l.qty + 1)}><PlusIcon width={14} /></button>
          </div>
          <button className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => remove(l.sku)}>Remove</button>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { drawerOpen, setDrawerOpen, lines, count, add, showToast } = useStore();
  const { products } = useCatalog();
  const totals = computeTotals(lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })));

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  // In-cart cross-sell (FR-CART-08): an accessory not already in the bag
  const inBag = new Set(lines.map((l) => l.productId));
  const upsell = products.find((p) => p.group === "Accessories" && !inBag.has(p.id) && p.variants.some((v) => v.stock > 0) && p.price < 300000);
  const upsellVariant = upsell?.variants.find((v) => v.stock > 0);

  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close bag" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-2xl">Your bag {count > 0 && <span className="font-sans text-sm text-muted">({count})</span>}</h2>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close bag" className="p-1"><CloseIcon /></button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <BagIcon width={40} height={40} className="text-clay" />
            <p className="font-display text-2xl">Your bag is empty</p>
            <p className="text-sm text-muted">Discover pieces made to be worn with pride.</p>
            <Link href="/collections/new-arrivals" onClick={() => setDrawerOpen(false)} className="btn btn-primary">Continue shopping</Link>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-5 py-4"><FreeShippingBar subtotal={totals.subtotal} /></div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {lines.map((l) => <CartLineRow key={l.sku} l={l} compact />)}
              {upsell && upsellVariant && (
                <li className="py-4">
                  <p className="eyebrow mb-2">Complete the look</p>
                  <div className="flex items-center gap-3 bg-cream p-2">
                    <ProductPhoto product={upsell} colour={upsell.colours[0]?.name} sizes="52px" className="h-16 w-13 shrink-0" />
                    <div className="flex-1 text-sm">
                      <p className="leading-snug">{upsell.name}</p>
                      <p className="text-muted">{formatPKR(upsell.price)}</p>
                    </div>
                    <button
                      className="btn btn-secondary min-h-9 px-3 text-[0.7rem]"
                      onClick={() => {
                        add(upsell.id, upsellVariant.sku);
                        showToast(`Added ${upsell.name}`);
                      }}
                    >
                      Add
                    </button>
                  </div>
                </li>
              )}
            </ul>
            <div className="space-y-3 border-t border-line px-5 py-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-medium">{formatPKR(totals.subtotal)}</span></div>
              <p className="text-xs text-muted">Delivery and promo codes calculated at checkout. Prices include tax.</p>
              <Link href="/checkout" onClick={() => setDrawerOpen(false)} className="btn btn-primary w-full">Checkout · Cash on delivery</Link>
              <Link href="/cart" onClick={() => setDrawerOpen(false)} className="btn btn-secondary w-full">View bag</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
