"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PRICE_BANDS, SORTS, type FilterState } from "@/lib/filters";
import type { Colour, Product } from "@/lib/types";
import { ProductGrid } from "./ProductRows";
import { CloseIcon, FilterIcon } from "./Icons";

interface Facets {
  sizes: string[];
  colours: Colour[];
  fits: string[];
  fabrics: string[];
  categories?: { slug: string; label: string }[];
}

export function Listing({ products, total, shown, facets, state }: { products: Product[]; total: number; shown: number; facets: Facets; state: FilterState }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    startTransition(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };

  const toggle = (key: string, value: string) =>
    update((p) => {
      const cur = (p.get(key) ?? "").split(",").filter(Boolean);
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });

  const flag = (key: string) => update((p) => (p.get(key) === "1" ? p.delete(key) : p.set(key, "1")));

  const active: [string, string, string][] = [
    ...state.category.map((v) => ["category", v, facets.categories?.find((c) => c.slug === v)?.label ?? v] as [string, string, string]),
    ...state.size.map((v) => ["size", v, `Size ${v}`] as [string, string, string]),
    ...state.colour.map((v) => ["colour", v, v] as [string, string, string]),
    ...state.price.map((v) => ["price", v, PRICE_BANDS.find((b) => b.key === v)?.label ?? v] as [string, string, string]),
    ...state.fit.map((v) => ["fit", v, `${v} fit`] as [string, string, string]),
    ...state.fabric.map((v) => ["fabric", v, v] as [string, string, string]),
  ];

  const nextPage = new URLSearchParams(sp.toString());
  nextPage.set("page", String(state.page + 1));

  const panel = (
    <div className="space-y-7">
      {facets.categories && facets.categories.length > 1 && (
        <FacetGroup title="Category">
          {facets.categories.map((c) => <Check key={c.slug} label={c.label} checked={state.category.includes(c.slug)} onChange={() => toggle("category", c.slug)} />)}
        </FacetGroup>
      )}
      <FacetGroup title="Availability">
        <Check label="In stock only" checked={state.instock} onChange={() => flag("instock")} />
        <Check label="On sale" checked={state.onsale} onChange={() => flag("onsale")} />
      </FacetGroup>
      <FacetGroup title="Size">
        <div className="flex flex-wrap gap-1.5">
          {facets.sizes.map((s) => (
            <button key={s} onClick={() => toggle("size", s)} aria-pressed={state.size.includes(s)} className={`min-w-11 border px-2 py-1.5 text-xs ${state.size.includes(s) ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"}`}>
              {s}
            </button>
          ))}
        </div>
      </FacetGroup>
      <FacetGroup title="Colour">
        <div className="grid grid-cols-2 gap-1.5">
          {facets.colours.map((c) => (
            <button key={c.name} onClick={() => toggle("colour", c.name)} aria-pressed={state.colour.includes(c.name)} className="flex items-center gap-2 py-1 text-start text-sm">
              <span className={`h-5 w-5 shrink-0 rounded-full border ${state.colour.includes(c.name) ? "ring-1 ring-ink ring-offset-2" : "border-line"}`} style={{ backgroundColor: c.hex }} />
              {c.name}
            </button>
          ))}
        </div>
      </FacetGroup>
      <FacetGroup title="Price">
        {PRICE_BANDS.map((b) => <Check key={b.key} label={b.label} checked={state.price.includes(b.key)} onChange={() => toggle("price", b.key)} />)}
      </FacetGroup>
      <FacetGroup title="Fit">
        {facets.fits.map((f) => <Check key={f} label={f} checked={state.fit.includes(f)} onChange={() => toggle("fit", f)} />)}
      </FacetGroup>
      <FacetGroup title="Fabric">
        {facets.fabrics.map((f) => <Check key={f} label={f} checked={state.fabric.includes(f)} onChange={() => toggle("fabric", f)} />)}
      </FacetGroup>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Filters">{panel}</aside>

      <div>
        <div className="sticky top-[61px] z-20 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-line bg-ivory/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-0">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] lg:hidden">
            <FilterIcon width={18} /> Filter {active.length > 0 && `(${active.length})`}
          </button>
          <p className="hidden text-sm text-muted lg:block" aria-live="polite">{total} {total === 1 ? "product" : "products"}</p>
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
            <span className="hidden sm:inline">Sort</span>
            <select
              value={state.sort}
              onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
              className="border border-line bg-white px-2 py-1.5 text-sm normal-case tracking-normal"
              aria-label="Sort products"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {active.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {active.map(([k, v, label]) => (
              <button key={`${k}-${v}`} onClick={() => toggle(k, v)} className="flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-xs">
                {label} <CloseIcon width={12} height={12} />
              </button>
            ))}
            <button onClick={() => update((p) => ["category", "size", "colour", "price", "fit", "fabric", "instock", "onsale"].forEach((k) => p.delete(k)))} className="text-xs underline underline-offset-4">
              Clear all
            </button>
          </div>
        )}

        <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <div className="py-20 text-center">
              <p className="font-display text-2xl">No pieces match these filters</p>
              <p className="mt-2 text-sm text-muted">Try removing a filter or two.</p>
            </div>
          )}
        </div>

        {shown < total && (
          <div className="mt-12 flex flex-col items-center gap-3">
            <p className="text-xs text-muted">Showing {shown} of {total}</p>
            <div className="h-0.5 w-40 bg-sand"><div className="h-0.5 bg-ink" style={{ width: `${(shown / total) * 100}%` }} /></div>
            <Link href={`${pathname}?${nextPage}`} scroll={false} className="btn btn-secondary">Load more</Link>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close filters" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[88%] max-w-sm flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-2xl">Filter</h2>
              <button onClick={() => setOpen(false)} aria-label="Close filters"><CloseIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{panel}</div>
            <div className="border-t border-line p-4">
              <button onClick={() => setOpen(false)} className="btn btn-primary w-full">Show {total} results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-ink">{title}</legend>
      <div className="space-y-1.5">{children}</div>
    </fieldset>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-ink" />
      {label}
    </label>
  );
}
