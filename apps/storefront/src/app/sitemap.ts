import type { MetadataRoute } from "next";
import { DEPARTMENTS } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog";
import { PAGES } from "@/lib/pages";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalog();
  const u = (p: string) => `${SITE.url}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    ...["sale", "new-arrivals", "all"].map((s) => ({ url: u(`/collections/${s}`), changeFrequency: "daily" as const, priority: 0.8 })),
    ...DEPARTMENTS.flatMap((d) => [
      { url: u(`/collections/${d.slug}`), changeFrequency: "daily" as const, priority: 0.9 },
      ...d.categories.map((c) => ({ url: u(`/collections/${d.slug}?category=${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ]),
    ...products.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.updatedAt ?? p.createdAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...Object.keys(PAGES).map((s) => ({ url: u(`/pages/${s}`), changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
