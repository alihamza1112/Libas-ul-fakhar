import Link from "next/link";
import { SITE } from "@/lib/site";

export function Breadcrumbs({ items }: { items: [string, string?][] }) {
  const all: [string, string?][] = [["Home", "/"], ...items];
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: href ? `${SITE.url}${href}` : undefined })),
  };
  return (
    <nav aria-label="Breadcrumb" className="py-4 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map(([name, href], i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {href && i < all.length - 1 ? <Link href={href} className="hover:text-ink hover:underline">{name}</Link> : <span aria-current="page" className="text-ink">{name}</span>}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </nav>
  );
}
