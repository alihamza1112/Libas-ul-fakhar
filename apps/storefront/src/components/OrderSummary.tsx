"use client";

import { useState } from "react";
import { COUPONS, formatPKR } from "@/lib/pricing";
import type { Totals } from "@/lib/types";
import { useStore } from "./StoreProvider";

export function CouponField() {
  const { coupon, setCoupon } = useStore();
  const [draft, setDraft] = useState("");
  if (coupon) {
    return (
      <div className="flex items-center justify-between bg-sand px-3 py-2 text-sm">
        <span>Code <strong>{coupon}</strong> applied</span>
        <button type="button" className="text-xs underline" onClick={() => setCoupon("")}>Remove</button>
      </div>
    );
  }
  // Not a <form>: this field also renders inside the checkout form, and forms can't nest.
  const apply = () => {
    if (draft.trim()) setCoupon(draft.trim().toUpperCase());
    setDraft("");
  };
  return (
    <div className="flex">
      <input
        className="field rounded-e-none uppercase"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="Promo code"
        aria-label="Promo code"
      />
      <button type="button" onClick={apply} className="btn btn-secondary rounded-s-none">Apply</button>
    </div>
  );
}

export function TotalsTable({ totals, cityKnown }: { totals: Totals; cityKnown: boolean }) {
  const { setCoupon } = useStore();
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPKR(totals.subtotal)}</dd></div>
      {totals.discount > 0 && <div className="flex justify-between text-sale"><dt>Discount ({totals.couponApplied})</dt><dd>−{formatPKR(totals.discount)}</dd></div>}
      {totals.couponApplied && totals.discount === 0 && <div className="flex justify-between text-success"><dt>{totals.couponApplied}</dt><dd>Free delivery</dd></div>}
      {totals.couponError && (
        <div className="flex items-start justify-between gap-2 text-xs text-sale" role="alert">
          <span>{totals.couponError}</span>
          <button type="button" className="underline" onClick={() => setCoupon("")}>Remove</button>
        </div>
      )}
      <div className="flex justify-between">
        <dt>Delivery</dt>
        <dd>{totals.shipping === 0 ? (totals.subtotal ? "Free" : "—") : `${formatPKR(totals.shipping)}${cityKnown ? "" : "*"}`}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatPKR(totals.total)}</dd></div>
      {!cityKnown && totals.shipping > 0 && <p className="text-xs text-muted">*Estimated. Final delivery charge depends on your city.</p>}
    </dl>
  );
}

export function CouponHints() {
  return (
    <details className="text-xs text-muted">
      <summary className="cursor-pointer">Available offers</summary>
      <ul className="mt-2 space-y-1">
        {COUPONS.map((c) => <li key={c.code}><strong className="text-ink">{c.code}</strong> — {c.label}</li>)}
      </ul>
    </details>
  );
}
