"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { MAX_BUNDLE_ITEMS } from "@/lib/bundles";
import { DEPARTMENTS } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import type { BundleItem, Garment } from "@/lib/types";
import { ProductArt } from "@/components/ProductArt";

/** What the editor needs to know about a product that can go inside a gift box. */
export interface BoxChoice {
  id: string;
  name: string;
  department: string;
  status: string;
  garment: Garment;
  price: number; // current selling price (paisa)
  variants: { sku: string; colour: string; size: string; stock: number; hex: string; image?: string }[];
}

/** Gift box contents: the admin fixes each item's exact size/colour and quantity. */
export function BoxContents({ items, onChange, choices }: { items: BundleItem[]; onChange: (next: BundleItem[]) => void; choices: BoxChoice[] }) {
  const [productId, setProductId] = useState("");
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState("1");
  const byId = useMemo(() => new Map(choices.map((c) => [c.id, c])), [choices]);
  const picked = byId.get(productId);

  const rows = items.map((it) => {
    const p = byId.get(it.productId);
    const v = p?.variants.find((x) => x.sku === it.sku);
    return { it, p, v };
  });
  const value = rows.reduce((s, r) => s + (r.p?.price ?? 0) * r.it.qty, 0);
  const boxes = rows.length ? Math.min(...rows.map((r) => (r.v ? Math.floor(r.v.stock / r.it.qty) : 0))) : 0;

  const add = () => {
    if (!picked || !sku) return;
    const n = Math.max(1, Math.min(10, Number(qty) || 1));
    const existing = items.find((x) => x.sku === sku);
    onChange(existing ? items.map((x) => (x.sku === sku ? { ...x, qty: Math.min(10, x.qty + n) } : x)) : [...items, { productId: picked.id, sku, qty: n }]);
    setSku("");
    setQty("1");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Choose the exact pieces that go in this box, with size and colour fixed. Customers buy the whole box as one item. 5–6 items work well (up to {MAX_BUNDLE_ITEMS}).
      </p>

      {rows.length > 0 ? (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map(({ it, p, v }, i) => (
            <li key={it.sku} className="flex flex-wrap items-center gap-3 py-2">
              <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-cream">
                {v?.image ? <Image src={v.image} alt="" fill sizes="44px" className="object-cover" /> : p ? <ProductArt garment={p.garment} hex={v?.hex ?? "#D8C3A5"} className="h-full w-full" /> : null}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate">{p?.name ?? "Item no longer exists"}</span>
                <span className="text-xs text-muted">
                  {v ? `${v.colour} · ${v.size} · ${v.stock} in stock` : it.sku}
                  {p && p.status !== "active" && <span className="ms-1 text-sale">· {p.status} (box will be unavailable)</span>}
                </span>
              </span>
              <label className="flex items-center gap-1 text-xs">
                Qty
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={it.qty}
                  onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, qty: Math.max(1, Math.min(10, Number(e.target.value) || 1)) } : x)))}
                  className="w-14 border border-line px-1.5 py-1 text-center"
                  aria-label={`Quantity of ${p?.name ?? it.sku}`}
                />
              </label>
              <span className="w-24 text-end text-sm tabular-nums">{p ? formatPKR(p.price * it.qty) : "—"}</span>
              <span className="flex gap-1">
                <button type="button" onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} disabled={i === 0} className="h-7 w-7 border border-line text-xs disabled:opacity-30" aria-label="Move up">↑</button>
                <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="h-7 px-2 text-xs text-muted hover:text-sale" aria-label={`Remove ${p?.name ?? it.sku}`}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bg-cream p-4 text-center text-sm text-muted">No items yet. Add the first piece below.</p>
      )}

      {rows.length > 0 && (
        <p className="text-sm">
          {rows.length} item{rows.length > 1 ? "s" : ""} · bought separately <strong>{formatPKR(value)}</strong> · enough stock for <strong>{boxes}</strong> box{boxes === 1 ? "" : "es"}
        </p>
      )}

      {items.length < MAX_BUNDLE_ITEMS && (
        <div className="grid gap-2 bg-cream p-3 sm:grid-cols-[1fr_1fr_80px_auto] sm:items-end">
          <label className="text-xs">
            Product
            <select className="field mt-1 min-h-10 py-1 text-sm" value={productId} onChange={(e) => { setProductId(e.target.value); setSku(""); }}>
              <option value="">Choose a product…</option>
              {DEPARTMENTS.filter((d) => choices.some((c) => c.department === d.slug)).map((d) => (
                <optgroup key={d.slug} label={d.label}>
                  {choices.filter((c) => c.department === d.slug).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {formatPKR(c.price)}{c.status !== "active" ? ` (${c.status})` : ""}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Size & colour (fixed for this box)
            <select className="field mt-1 min-h-10 py-1 text-sm" value={sku} onChange={(e) => setSku(e.target.value)} disabled={!picked}>
              <option value="">{picked ? "Choose…" : "Pick a product first"}</option>
              {picked?.variants.map((v) => (
                <option key={v.sku} value={v.sku} disabled={v.stock === 0}>{v.colour} · {v.size} — {v.stock === 0 ? "sold out" : `${v.stock} in stock`}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Qty
            <input type="number" min={1} max={10} value={qty} onChange={(e) => setQty(e.target.value)} className="field mt-1 min-h-10 py-1 text-sm" />
          </label>
          <button type="button" onClick={add} disabled={!sku} className="btn btn-primary min-h-10 px-4">Add</button>
        </div>
      )}
    </div>
  );
}
