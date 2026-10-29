import { deliveryEstimate } from "@/lib/cities";
import { HAPPY_PATH, STATUS_LABEL } from "@/lib/orderStatus";
import { formatPKR } from "@/lib/pricing";
import type { Order } from "@/lib/types";
import Image from "next/image";
import { ProductArt } from "./ProductArt";

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });
}

export function OrderTimeline({ order }: { order: Order }) {
  const offPath = !HAPPY_PATH.includes(order.status);
  const idx = HAPPY_PATH.indexOf(order.status);
  return (
    <div>
      {offPath ? (
        <p className="mb-4 inline-block bg-sand px-3 py-1 text-sm">{STATUS_LABEL[order.status]}</p>
      ) : (
        <ol className="mb-6 grid grid-cols-6 gap-1" aria-label="Order progress">
          {HAPPY_PATH.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`h-1 ${i <= idx ? "bg-ink" : "bg-sand"}`} />
              <p className={`mt-2 text-[10px] leading-tight sm:text-[11px] ${i <= idx ? "text-ink" : "text-muted"}`}>{STATUS_LABEL[s]}</p>
            </li>
          ))}
        </ol>
      )}
      <ul className="space-y-2 border-s border-line ps-4 text-sm">
        {[...order.history].reverse().map((h, i) => (
          <li key={i}>
            <span className="font-medium">{STATUS_LABEL[h.status]}</span> <span className="text-muted">· {fmtDate(h.at)}</span>
            {h.note && <p className="text-xs text-muted">{h.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderItems({ order }: { order: Order }) {
  return (
    <ul className="divide-y divide-line">
      {order.items.map((it) => {
        return (
          <li key={it.sku} className="flex gap-3 py-3">
            {it.image ? (
              <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-cream">
                <Image src={it.image} alt={`${it.name} in ${it.colour}`} fill sizes="64px" className="object-cover" />
              </div>
            ) : it.garment ? (
              <ProductArt garment={it.garment} hex={it.hex ?? "#D8C3A5"} className="h-20 w-16 shrink-0" />
            ) : (
              <div className="h-20 w-16 shrink-0 bg-cream" />
            )}
            <div className="flex-1 text-sm">
              <p>{it.name}</p>
              <p className="text-xs text-muted">{it.colour} · {it.size} · Qty {it.qty}</p>
              <p className="text-xs text-muted">SKU {it.sku}</p>
              {it.components && (
                <ul className="mt-1 border-s border-line ps-2 text-xs text-muted">
                  {it.components.map((c) => (
                    <li key={c.sku}>{c.qty * it.qty} × {c.name} · {c.colour}{c.size !== "One Size" ? ` · ${c.size}` : ""} <span className="opacity-70">({c.sku})</span></li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-sm">{formatPKR(it.unitPrice * it.qty)}</p>
          </li>
        );
      })}
    </ul>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  const t = order.totals;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(t.subtotal)}</dd></div>
      {t.discount > 0 && <div className="flex justify-between text-sale"><dt>Discount ({order.coupon})</dt><dd>−{formatPKR(t.discount)}</dd></div>}
      <div className="flex justify-between"><dt>Delivery</dt><dd>{t.shipping ? formatPKR(t.shipping) : "Free"}</dd></div>
      <div className="flex justify-between border-t border-line pt-2 font-medium"><dt>Total {order.payment === "cod" ? "(pay on delivery)" : ""}</dt><dd>{formatPKR(t.total)}</dd></div>
    </dl>
  );
}

export function eta(order: Order) {
  return deliveryEstimate(order.address.city);
}
