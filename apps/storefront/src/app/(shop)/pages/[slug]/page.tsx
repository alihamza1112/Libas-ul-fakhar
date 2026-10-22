import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PAGES } from "@/lib/pages";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const page = PAGES[(await params).slug];
  return page ? { title: page.title, alternates: { canonical: `/pages/${(await params).slug}` } } : {};
}

export default async function CmsPage({ params }: PageProps<"/pages/[slug]">) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4">
      <Breadcrumbs items={[[page.title]]} />
      <article className="pb-10">
        <h1 className="text-4xl md:text-5xl">{page.title}</h1>
        {page.intro && <p className="mt-3 text-lg text-ink-soft">{page.intro}</p>}
        <div className="mt-8 space-y-8">
          {page.sections.map((s, i) => (
            <section key={i}>
              {s.heading && <h2 className="mb-2 text-2xl">{s.heading}</h2>}
              {s.body.map((b, j) => <p key={j} className="mb-2 leading-relaxed text-ink-soft">{b}</p>)}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
