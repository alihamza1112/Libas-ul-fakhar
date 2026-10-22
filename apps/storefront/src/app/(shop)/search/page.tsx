import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { applyFilters, facets, PAGE_SIZE, parseFilters } from "@/lib/filters";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/search";
import { getCatalog } from "@/lib/server/catalog";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Listing } from "@/components/Listing";
import { ProductRail } from "@/components/ProductRows";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const all = await getCatalog();
  const base = q ? searchProducts(all, q) : [];
  const state = parseFilters(sp);
  // Relevance order unless the shopper picked a sort
  const filtered = state.sort === "featured" ? base.filter((p) => applyFilters([p], { ...state, sort: "featured" }).length) : applyFilters(base, state);
  const shown = Math.min(filtered.length, state.page * PAGE_SIZE);

  if (q && !base.length) console.info(`[search] zero results: "${q}"`); // zero-result analytics hook

  return (
    <div className="mx-auto max-w-7xl px-4">
      <Breadcrumbs items={[["Search"]]} />
      <header className="mb-8 text-center">
        <p className="eyebrow">Search results</p>
        <h1 className="mt-1 text-4xl">{q ? `“${q}”` : "Search"}</h1>
        <form action="/search" className="mx-auto mt-5 flex max-w-lg">
          <input name="q" defaultValue={q} className="field rounded-e-none" placeholder="Search the collection" aria-label="Search" />
          <button className="btn btn-primary rounded-s-none">Search</button>
        </form>
      </header>

      {base.length ? (
        <Suspense>
          <Listing products={filtered.slice(0, shown)} total={filtered.length} shown={shown} facets={facets(base)} state={state} />
        </Suspense>
      ) : (
        <div className="space-y-10 py-6">
          {q && (
            <div className="text-center">
              <p className="font-display text-2xl">We couldn’t find anything for “{q}”</p>
              <p className="mt-2 text-sm text-muted">Check the spelling or try one of these:</p>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-ink">{s}</Link>
            ))}
          </div>
          <section>
            <h2 className="mb-6 text-3xl">Best sellers</h2>
            <ProductRail products={[...all].sort((a, b) => a.salesRank - b.salesRank).slice(0, 4)} />
          </section>
        </div>
      )}
    </div>
  );
}
