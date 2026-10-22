"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { CartLine } from "@/lib/types";
import { useCatalog } from "@/components/CatalogProvider";
import { useStore } from "@/components/StoreProvider";
import { whatsappLink } from "@/lib/site";
import { cancelOrderAction, type FormState } from "../../actions";

export function OrderActions({ number, canCancel, delivered, items }: { number: string; canCancel: boolean; delivered: boolean; items: CartLine[] }) {
  const [state, cancel, cancelling] = useActionState<FormState, FormData>(cancelOrderAction, {});
  const { byId } = useCatalog();
  const { add, showToast } = useStore();
  const [note, setNote] = useState("");

  // Reorder (FR-ACC-03): add what is still sold and in stock back to the bag
  const reorder = () => {
    let added = 0;
    const skipped: string[] = [];
    for (const it of items) {
      const p = byId(it.productId);
      const v = p?.variants.find((x) => x.sku === it.sku);
      if (p && v && (v.stock > 0 || p.preOrder)) {
        add(p.id, v.sku, Math.min(it.qty, p.preOrder ? it.qty : v.stock));
        added++;
      } else skipped.push(p?.name ?? "an item");
    }
    if (added) showToast(`Added ${added} item${added > 1 ? "s" : ""} to your bag`);
    setNote(skipped.length ? `Not available any more: ${skipped.join(", ")}.` : "");
  };

  return (
    <section className="space-y-3 bg-white p-5">
      <button type="button" onClick={reorder} className="btn btn-primary w-full">Buy again</button>
      {note && <p className="text-xs text-muted">{note}</p>}
      {canCancel && (
        <form action={cancel}>
          <input type="hidden" name="number" value={number} />
          <button className="btn btn-secondary w-full" disabled={cancelling} onClick={(e) => { if (!confirm("Cancel this order?")) e.preventDefault(); }}>
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
          <p className="mt-1 text-xs text-muted">You can cancel until the order ships.</p>
        </form>
      )}
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-success" role="status">Order cancelled.</p>}
      {delivered && <Link href="/pages/returns" className="btn btn-secondary w-full">Exchange or return</Link>}
      <a href={whatsappLink(`Assalam-o-Alaikum, I have a question about order ${number}.`)} target="_blank" rel="noopener noreferrer" className="block text-center text-sm underline">Help with this order</a>
    </section>
  );
}
