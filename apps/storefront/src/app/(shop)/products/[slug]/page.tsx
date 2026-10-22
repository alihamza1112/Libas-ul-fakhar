import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryLabel, getDepartment } from "@/lib/catalog";
import { getCatalog, getCatalogProduct } from "@/lib/server/catalog";
import { SITE } from "@/lib/site";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductDetail } from "@/components/ProductDetail";
import { PersonalRows, ProductRail, SectionHead } from "@/components/ProductRows";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getCatalogProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: `${p.name} – ${p.fabric}, ${p.fit.toLowerCase()} fit. ${p.description.slice(0, 110)}`,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, type: "website", ...(p.images?.length ? { images: [{ url: p.images[0].url, width: p.images[0].width, height: p.images[0].height }] } : {}) },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const p = await getCatalogProduct(slug);
  if (!p) notFound();
  const dept = getDepartment(p.department)!;
  const all = await getCatalog();

  const related = all.filter((x) => x.id !== p.id && x.department === p.department && x.category === p.category).slice(0, 4);
  const lookGarments = p.group === "Eastern" ? ["waistcoat", "shawl", "cap", "trouser"] : ["trouser", "belt", "shirt", "polo"];
  const completeLook = all.filter((x) => x.id !== p.id && x.department === p.department && lookGarments.includes(x.garment) && x.garment !== p.garment).slice(0, 4);

  const inStock = p.variants.some((v) => v.stock > 0);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.id,
    description: p.description,
    brand: { "@type": "Brand", name: SITE.name },
    material: p.fabric,
    ...(p.images?.length ? { image: p.images.map((i) => `${SITE.url}${i.url}`) } : {}),
    color: p.colours.map((c) => c.name).join(", "),
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/products/${p.slug}`,
      priceCurrency: "PKR",
      price: (p.price / 100).toFixed(0),
      availability: p.preOrder ? "https://schema.org/PreOrder" : inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(p.reviews.length
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.toFixed(1), reviewCount: p.reviews.length },
          review: p.reviews.map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.author }, reviewRating: { "@type": "Rating", ratingValue: r.rating }, name: r.title, reviewBody: r.body })),
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-7xl px-4">
      <Breadcrumbs items={[[dept.label, `/collections/${dept.slug}`], [categoryLabel(p), `/collections/${dept.slug}?category=${p.category}`], [p.name]]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <ProductDetail p={p} initialColour={typeof sp.colour === "string" ? sp.colour : undefined} />

      {completeLook.length > 0 && (
        <section className="py-12">
          <SectionHead eyebrow="Style it with" title="Complete the look" />
          <ProductRail products={completeLook} />
        </section>
      )}
      {related.length > 0 && (
        <section className="py-12">
          <SectionHead title="You may also like" href={`/collections/${dept.slug}?category=${p.category}`} />
          <ProductRail products={related} />
        </section>
      )}
      <div className="-mx-4"><PersonalRows products={all} exclude={p.id} /></div>
    </div>
  );
}
