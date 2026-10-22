import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDepartment, isNew } from "@/lib/catalog";
import { applyFilters, facets, PAGE_SIZE, parseFilters } from "@/lib/filters";
import { getCatalog } from "@/lib/server/catalog";
import type { Product } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Listing } from "@/components/Listing";

const SPECIAL: Record<string, { title: string; intro: string; filter: (p: Product) => boolean }> = {
  sale: { title: "Sale", intro: "Up to 50% off selected styles across every department.", filter: (p) => !!p.compareAt },
  "new-arrivals": { title: "New Arrivals", intro: "The latest pieces from our workshop, added this month.", filter: isNew },
  all: { title: "All Products", intro: "Every piece in the Libas-ul-Fakhar collection.", filter: () => true },
};

function resolve(slug: string) {
  const dept = getDepartment(slug);
  if (dept) return { title: dept.label, intro: dept.tagline, filter: (p: Product) => p.department === dept.slug, dept };
  const s = SPECIAL[slug];
  return s ? { ...s, dept: undefined } : undefined;
}

export async function generateMetadata({ params, searchParams }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const c = resolve(slug);
  if (!c) return {};
  const cat = c.dept?.categories.find((x) => x.slug === sp.category);
  const title = cat ? `${c.title}'s ${cat.label}` : c.title;
  // Only the clean category URL is indexable; other filter combinations canonicalise to it.
  return { title, description: `${c.intro} Shop ${title.toLowerCase()} online with cash on delivery across Pakistan.`, alternates: { canonical: cat ? `/collections/${slug}?category=${cat.slug}` : `/collections/${slug}` } };
}

export default async function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const c = resolve(slug);
  if (!c) notFound();
  const sp = await searchParams;
  const state = parseFilters(sp);
  const base = (await getCatalog()).filter(c.filter);
  const filtered = applyFilters(base, state);
  const shown = Math.min(filtered.length, state.page * PAGE_SIZE);

  const cat = c.dept && state.category.length === 1 ? c.dept.categories.find((x) => x.slug === state.category[0]) : undefined;
  const categories = c.dept
    ? c.dept.categories
    : Array.from(new Map(base.map((p) => [p.category, { slug: p.category, label: p.category.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) }])).values());

  return (
    <div className="mx-auto max-w-7xl px-4">
      <Breadcrumbs items={cat ? [[c.title, `/collections/${slug}`], [cat.label]] : [[c.title]]} />
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl">{cat ? `${c.title}'s ${cat.label}` : c.title}</h1>
        <p className="mt-2 text-sm text-muted">{c.intro}</p>
        {c.dept && (
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1 md:justify-center">
            {c.dept.categories.map((x) => (
              <Link key={x.slug} href={`/collections/${slug}?category=${x.slug}`} className={`shrink-0 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.12em] ${state.category.includes(x.slug) ? "border-ink bg-ink text-ivory" : "border-line bg-white hover:border-ink"}`}>
                {x.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <Suspense>
        <Listing products={filtered.slice(0, shown)} total={filtered.length} shown={shown} facets={{ ...facets(base), categories }} state={state} />
      </Suspense>
    </div>
  );
}
