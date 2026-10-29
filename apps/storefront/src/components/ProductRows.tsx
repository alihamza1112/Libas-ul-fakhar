"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CLOTHING_DEPARTMENTS } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { useStore } from "./StoreProvider";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => <ProductCard key={p.id} p={p} priority={i < 4} />)}
    </div>
  );
}

export function ProductRail({ products }: { products: Product[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
      {products.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start md:w-[31%] lg:w-auto">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}

export function SectionHead({ eyebrow, title, href, cta = "View all" }: { eyebrow?: string; title: string; href?: string; cta?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-3xl md:text-4xl">{title}</h2>
      </div>
      {href && <Link href={href} className="shrink-0 text-xs uppercase tracking-[0.16em] underline underline-offset-4">{cta}</Link>}
    </div>
  );
}

const TABS = [
  { key: "sale", label: "Sale" },
  { key: "Eastern", label: "Eastern" },
  { key: "Western", label: "Western" },
  { key: "Accessories", label: "Accessories" },
] as const;

/** Tabbed rows per department (FR-HOME-03). */
export function DepartmentTabs({ products }: { products: Product[] }) {
  const [dept, setDept] = useState<string>("men");
  const [tab, setTab] = useState<string>("sale");
  const d = CLOTHING_DEPARTMENTS.find((x) => x.slug === dept)!;
  const tabs = TABS.filter((t) => t.key === "sale" || d.categories.some((c) => c.group === t.key));
  const list = products
    .filter((p) => p.department === dept && (tab === "sale" ? !!p.compareAt : p.group === tab))
    .sort((a, b) => a.salesRank - b.salesRank)
    .slice(0, 8);

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <p className="eyebrow">Shop by department</p>
        <div className="flex gap-6" role="tablist" aria-label="Department">
          {CLOTHING_DEPARTMENTS.map((x) => (
            <button
              key={x.slug}
              role="tab"
              aria-selected={dept === x.slug}
              onClick={() => { setDept(x.slug); setTab("sale"); }}
              className={`font-display text-2xl md:text-3xl transition-colors ${dept === x.slug ? "text-ink underline decoration-1 underline-offset-8" : "text-muted hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Category">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.14em] ${tab === t.key ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {list.length ? <ProductRail products={list} /> : <p className="py-10 text-center text-sm text-muted">New pieces landing soon.</p>}
      <div className="mt-8 text-center">
        <Link href={`/collections/${dept}`} className="btn btn-secondary">Shop all {d.label}</Link>
      </div>
    </section>
  );
}

/** Recently viewed + "Recommended for you" (FR-HOME-08, FR-NAV-04). */
export function PersonalRows({ products, exclude }: { products: Product[]; exclude?: string }) {
  const { recent, wishlist, ready } = useStore();
  const viewed = recent.filter((id) => id !== exclude).map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];

  const recommended = useMemo(() => {
    const seen = new Set([...recent, ...wishlist, exclude]);
    const seeds = [...recent, ...wishlist].map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
    if (!seeds.length) return [];
    const depts = new Set(seeds.map((s) => s.department));
    const garments = new Set(seeds.map((s) => s.garment));
    return products
      .filter((p) => !seen.has(p.id) && depts.has(p.department))
      .sort((a, b) => Number(garments.has(b.garment)) - Number(garments.has(a.garment)) || a.salesRank - b.salesRank)
      .slice(0, 4);
  }, [products, recent, wishlist, exclude]);

  if (!ready) return null;
  return (
    <>
      {recommended.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionHead eyebrow="Picked for you" title="Recommended for you" />
          <ProductRail products={recommended} />
        </section>
      )}
      {viewed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <SectionHead title="Recently viewed" />
          <ProductRail products={viewed.slice(0, 4)} />
        </section>
      )}
    </>
  );
}
