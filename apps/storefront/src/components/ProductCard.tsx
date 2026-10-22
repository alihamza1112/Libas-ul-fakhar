"use client";

import Link from "next/link";
import { useState } from "react";
import { discountPct } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import type { Product } from "@/lib/types";
import { imagesFor } from "@/lib/productImages";
import { ProductPhoto } from "./ProductPhoto";
import { HeartIcon } from "./Icons";
import { useStore } from "./StoreProvider";

export function PriceBlock({ price, compareAt, size = "sm" }: { price: number; compareAt?: number; size?: "sm" | "lg" }) {
  const pct = discountPct({ price, compareAt });
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 ${size === "lg" ? "text-xl" : "text-sm"}`}>
      <span className={compareAt ? "text-sale font-medium" : ""}>{formatPKR(price)}</span>
      {compareAt && (
        <>
          <s className="text-muted" aria-label={`Was ${formatPKR(compareAt)}`}>{formatPKR(compareAt)}</s>
          {size === "lg" && <span className="text-sm text-sale">Save {formatPKR(compareAt - price)} ({pct}%)</span>}
        </>
      )}
    </span>
  );
}

export function ProductBadges({ p, stockCount }: { p: Product; stockCount: number }) {
  const pct = discountPct(p);
  return (
    <div className="pointer-events-none absolute start-2 top-2 flex flex-col items-start gap-1">
      {stockCount === 0 && !p.preOrder ? (
        <span className="bg-ink px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ivory">Sold out</span>
      ) : (
        <>
          {pct > 0 && <span className="bg-sale px-2 py-0.5 text-[11px] font-medium text-white">-{pct}%</span>}
          {p.isNew && <span className="bg-ivory px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">New</span>}
          {p.preOrder && <span className="bg-gold px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-white">Pre-order</span>}
          {!p.preOrder && stockCount > 0 && stockCount <= 6 && (
            <span className="bg-ivory px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-sale">Low stock</span>
          )}
        </>
      )}
    </div>
  );
}

export function ProductCard({ p, priority = false }: { p: Product; priority?: boolean }) {
  const [colour, setColour] = useState(p.colours[0]);
  const [quick, setQuick] = useState(false);
  const { wishlist, toggleWish, add, showToast } = useStore();
  const wished = wishlist.includes(p.id);
  const variants = p.variants.filter((v) => v.colour === colour.name);
  const stockCount = variants.reduce((s, v) => s + v.stock, 0);
  // Hover view: second photo, or the art detail view when there are no photos yet
  const photoCount = imagesFor(p, colour.name).length;
  const hasHover = photoCount !== 1;

  return (
    <article className="group relative" data-priority={priority || undefined}>
      <div className="relative overflow-hidden bg-cream">
        <Link href={`/products/${p.slug}?colour=${encodeURIComponent(colour.name)}`} aria-label={p.name}>
          <ProductPhoto product={p} colour={colour.name} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" preload={priority} className={`aspect-[4/5] w-full transition-opacity duration-200 ${hasHover ? "group-hover:opacity-0" : ""}`} />
          {hasHover && <ProductPhoto product={p} colour={colour.name} index={1} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" className="absolute inset-0 aspect-[4/5] w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100" />}
        </Link>
        <ProductBadges p={p} stockCount={stockCount} />
        <button
          onClick={() => toggleWish(p.id)}
          className="absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-ivory/90 hover:bg-ivory"
          aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
          aria-pressed={wished}
        >
          <HeartIcon filled={wished} width={18} height={18} className={wished ? "text-sale" : ""} />
        </button>

        {/* Quick add (FR-PLP-05) */}
        <div className="absolute inset-x-2 bottom-2 hidden md:block">
          {quick ? (
            <div className="bg-ivory/95 p-2 shadow" onMouseLeave={() => setQuick(false)}>
              <p className="mb-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-muted">Select size</p>
              <div className="flex flex-wrap justify-center gap-1">
                {variants.map((v) => (
                  <button
                    key={v.sku}
                    disabled={v.stock === 0 && !p.preOrder}
                    onClick={() => {
                      add(p.id, v.sku);
                      setQuick(false);
                      showToast(`Added ${p.name} (${v.size})`);
                    }}
                    className="min-w-9 border border-line bg-white px-1.5 py-1 text-xs hover:border-ink disabled:cursor-not-allowed disabled:text-muted/50 disabled:line-through"
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            (stockCount > 0 || p.preOrder) && (
              <button onClick={() => setQuick(true)} className="btn btn-primary w-full translate-y-2 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100 min-h-10">
                Quick add
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <h3 className="font-sans text-sm leading-snug">
          <Link href={`/products/${p.slug}`} className="hover:underline underline-offset-4">{p.name}</Link>
        </h3>
        <PriceBlock price={p.price} compareAt={p.compareAt} />
        {p.colours.length > 1 && (
          <div className="flex gap-1.5 pt-0.5" role="radiogroup" aria-label="Colour">
            {p.colours.map((c) => (
              <button
                key={c.name}
                role="radio"
                aria-checked={c.name === colour.name}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColour(c)}
                className={`h-4 w-4 rounded-full border ${c.name === colour.name ? "ring-1 ring-ink ring-offset-2 ring-offset-ivory" : "border-line"}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
        <p className="flex flex-wrap gap-1 text-[11px] text-muted" aria-label="Sizes">
          {variants.map((v) => (
            <span key={v.sku} className={v.stock === 0 && !p.preOrder ? "line-through opacity-50" : ""}>{v.size}</span>
          ))}
        </p>
      </div>
    </article>
  );
}
