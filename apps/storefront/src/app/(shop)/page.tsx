import Link from "next/link";
import { CLOTHING_DEPARTMENTS, GIFTS, isNew } from "@/lib/catalog";
import { getCatalog } from "@/lib/server/catalog";
import { formatPKR } from "@/lib/pricing";
import { ProductArt } from "@/components/ProductArt";
import { ProductPhoto } from "@/components/ProductPhoto";
import { DepartmentTabs, PersonalRows, ProductRail, SectionHead } from "@/components/ProductRows";
import { CashIcon, ReturnIcon, TruckIcon, WhatsAppIcon } from "@/components/Icons";
import { whatsappLink } from "@/lib/site";

const TILE_ART = {
  men: { garment: "kurta", hex: "#F3EBDD" },
  women: { garment: "kameez", hex: "#C99A92" },
  boys: { garment: "kurta", hex: "#9DB8CF" },
  girls: { garment: "frock", hex: "#B7A3C4" },
} as const;

const LOOK = ["noor-embroidered-cotton-kurta-men", "nawab-textured-waistcoat-men", "kashmiri-wool-shawl-men"];

export default async function Home() {
  const products = await getCatalog();
  const newArrivals = products.filter(isNew).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const bestSellers = [...products].sort((a, b) => a.salesRank - b.salesRank).slice(0, 8);
  const look = LOOK.map((s) => products.find((p) => p.slug === s)).filter((p) => p !== undefined);
  const lookTotal = look.reduce((s, p) => s + p.price, 0);
  const giftBoxes = products.filter((p) => p.department === GIFTS && p.bundle).sort((a, b) => a.salesRank - b.salesRank).slice(0, 4);

  return (
    <>
      {/* Hero (FR-HOME-01) – content would be scheduled from the CMS */}
      <section className="texture relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-24">
          <div className="space-y-6 text-center md:text-start">
            <p className="eyebrow text-ink-soft">Festive Edit 2026</p>
            <h1 className="text-5xl leading-[1.05] md:text-7xl">Dressed in<br /><em className="font-normal">pride.</em></h1>
            <p className="mx-auto max-w-md text-ink-soft md:mx-0">
              Hand-finished kurtas, waistcoats and shawls for the season of gatherings. Up to 50% off selected styles.
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Link href="/collections/sale" className="btn btn-primary">Shop the sale</Link>
              <Link href="/collections/new-arrivals" className="btn btn-secondary">New arrivals</Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="grid grid-cols-2 gap-3">
              <ProductArt garment="kurta" hex="#F3EBDD" embroidered className="aspect-[4/5] w-full shadow-xl" title="Ivory embroidered kurta" />
              <ProductArt garment="waistcoat" hex="#1F5C46" embroidered className="mt-10 aspect-[4/5] w-full shadow-xl" title="Emerald velvet waistcoat" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-cream">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 text-xs md:grid-cols-4 md:text-sm">
          {[
            [CashIcon, "Cash on delivery", "Pay when it arrives"],
            [TruckIcon, "Free delivery", "On orders over Rs. 4,999"],
            [ReturnIcon, "7-day exchange", "Easy returns portal"],
            [WhatsAppIcon, "WhatsApp support", "Order & ask on chat"],
          ].map(([Icon, t, s]) => {
            const I = Icon as typeof CashIcon;
            return (
              <li key={t as string} className="flex items-center gap-3">
                <I className="shrink-0 text-gold" />
                <span><span className="block font-medium">{t as string}</span><span className="text-muted">{s as string}</span></span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Department tiles (FR-HOME-02) */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {CLOTHING_DEPARTMENTS.map((d) => {
            const art = TILE_ART[d.slug as keyof typeof TILE_ART];
            return (
              <Link key={d.slug} href={`/collections/${d.slug}`} className="group relative block overflow-hidden">
                <ProductArt garment={art.garment} hex={art.hex} className="aspect-[4/5] w-full transition-transform duration-500 group-hover:scale-[1.03]" title={`${d.label} collection`} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent p-4 text-ivory">
                  <p className="font-display text-3xl">{d.label}</p>
                  <p className="text-[0.7rem] uppercase tracking-[0.18em]">Shop now →</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <DepartmentTabs products={products} />

      {/* Tohfa-e-Khaas gift boxes */}
      {giftBoxes.length > 0 && (
        <section className="texture py-14">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHead eyebrow="Ready to give" title="Tohfa-e-Khaas" href="/collections/gifts" cta="All gift boxes" />
            <p className="-mt-3 mb-6 max-w-xl text-sm text-ink-soft">Curated boxes of our finest pieces, packed together and priced as one, for Eid, weddings and every occasion worth celebrating.</p>
            <ProductRail products={giftBoxes} />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHead eyebrow="Just landed" title="New arrivals" href="/collections/new-arrivals" />
        <ProductRail products={newArrivals.slice(0, 4)} />
      </section>

      {/* Shoppable look (FR-HOME-06) */}
      <section className="bg-cream py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2">
          <div className="grid grid-cols-3 gap-3">
            {look.map((p, i) => (
              <Link key={p.id} href={`/products/${p.slug}`} className={i === 1 ? "mt-8" : ""}>
                <ProductPhoto product={p} colour={p.colours[0]?.name} sizes="(min-width: 768px) 16vw, 33vw" className="aspect-[4/5] w-full" />
              </Link>
            ))}
          </div>
          <div className="space-y-5">
            <p className="eyebrow">The Lookbook</p>
            <h2 className="text-4xl md:text-5xl">The Mehfil Look</h2>
            <p className="text-ink-soft">An ivory embroidered kurta, a textured waistcoat and a Kashmiri wool shawl — layered for winter weddings and evening dawats.</p>
            <ul className="divide-y divide-line border-y border-line">
              {look.map((p) => (
                <li key={p.id} className="flex justify-between py-3 text-sm">
                  <Link href={`/products/${p.slug}`} className="hover:underline underline-offset-4">{p.name}</Link>
                  <span>{formatPKR(p.price)}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">Complete look: <strong>{formatPKR(lookTotal)}</strong></p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHead eyebrow="Most loved" title="Best sellers" href="/collections/all?sort=best" />
        <ProductRail products={bestSellers.slice(0, 4)} />
      </section>

      <PersonalRows products={products} />

      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="texture grid items-center gap-6 p-8 text-center md:grid-cols-[1fr_auto] md:p-12 md:text-start">
          <div>
            <h2 className="text-3xl md:text-4xl">Order on WhatsApp</h2>
            <p className="mt-2 text-ink-soft">Send us a product link and your size — our team confirms your order in minutes.</p>
          </div>
          <a href={whatsappLink("Assalam-o-Alaikum! I would like to place an order.")} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><WhatsAppIcon /> Chat with us</a>
        </div>
      </section>
    </>
  );
}
