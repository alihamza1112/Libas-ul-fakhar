"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CITIES, deliveryEstimate } from "@/lib/cities";
import { chartFor, recommendSize } from "@/lib/sizeGuide";
import { formatPKR } from "@/lib/pricing";
import { SITE, whatsappLink } from "@/lib/site";
import { imagesFor } from "@/lib/productImages";
import type { Product, Variant } from "@/lib/types";
import { ProductPhoto } from "./ProductPhoto";
import { PriceBlock } from "./ProductCard";
import { CashIcon, CloseIcon, HeartIcon, ReturnIcon, RulerIcon, ShareIcon, StarIcon, TruckIcon, WhatsAppIcon } from "./Icons";
import { useStore } from "./StoreProvider";

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex text-gold" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} filled={value >= i - 0.25} width={size} height={size} />)}
    </span>
  );
}

// Same value for the desktop main image and the first mobile slide, so the browser
// picks one candidate and downloads the hero photo once.
const MAIN_SIZES = "(min-width: 768px) 55vw, 100vw";

function Gallery({ product, colour }: { product: Product; colour: string }) {
  // Real photos for this colour when uploaded; otherwise two views of the placeholder art
  const count = imagesFor(product, colour).length || 2;
  const slides = Array.from({ length: count }, (_, i) => i);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const label = (i: number) => `image ${i + 1} of ${count}`;

  return (
    <div className="self-start md:sticky md:top-32 md:grid md:grid-cols-[72px_1fr] md:items-start md:gap-4">
      <div className="hidden max-h-[80vh] flex-col gap-3 overflow-y-auto md:flex">
        {slides.map((i) => (
          <button key={i} onClick={() => setActive(i)} aria-label={`Show ${label(i)}`} aria-current={active === i} className={`border ${active === i ? "border-ink" : "border-transparent"}`}>
            <ProductPhoto product={product} colour={colour} index={i} sizes="72px" className="aspect-[4/5] w-full" />
          </button>
        ))}
      </div>

      {/* Desktop: hover to zoom. Mobile: swipe between images. */}
      <div
        className="relative hidden cursor-zoom-in overflow-hidden bg-cream md:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <div className="transition-transform duration-150" style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
          <ProductPhoto product={product} colour={colour} index={active} sizes={MAIN_SIZES} preload={active === 0} className="aspect-[4/5] w-full" />
        </div>
      </div>
      <div className="md:hidden">
        <div
          ref={track}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {slides.map((i) => (
            <div key={i} className="w-full shrink-0 snap-center">
              <ProductPhoto product={product} colour={colour} index={i} sizes={MAIN_SIZES} preload={i === 0} className="aspect-[4/5] w-full" />
            </div>
          ))}
        </div>
        {count > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {slides.map((i) => (
              <button key={i} aria-label={`Show ${label(i)}`} onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })} className={`h-1.5 rounded-full transition-all ${active === i ? "w-6 bg-ink" : "w-1.5 bg-clay"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end md:place-items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto bg-ivory p-6 md:max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl">{title}</h2>
          <button onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SizeGuide({ p, onClose, onPick }: { p: Product; onClose: () => void; onPick: (s: string) => void }) {
  const chart = chartFor(p)!;
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [h, setH] = useState("");
  const [w, setW] = useState("");
  const kids = p.department === "boys" || p.department === "girls";
  const rec = recommendSize(p, Number(h), kids ? 1 : Number(w));
  const conv = (n: number) => (unit === "cm" ? (n * 2.54).toFixed(0) : n);
  return (
    <Modal title="Size guide" onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted">{chart.title} · body measurements</p>
        <div className="flex border border-line text-xs">
          {(["in", "cm"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)} aria-pressed={unit === u} className={`px-3 py-1 ${unit === u ? "bg-ink text-ivory" : ""}`}>{u === "in" ? "Inches" : "cm"}</button>
          ))}
        </div>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-ink text-start"><th className="py-2 text-start font-medium">Size</th>{chart.columns.map((c) => <th key={c} className="py-2 text-start font-medium">{c}</th>)}</tr></thead>
        <tbody>
          {chart.rows.map(([size, ...vals]) => (
            <tr key={size} className={`border-b border-line ${rec === size ? "bg-sand" : ""}`}>
              <td className="py-2 font-medium">{size}</td>
              {vals.map((v, i) => <td key={i} className="py-2 tabular-nums">{conv(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 bg-cream p-4">
        <p className="mb-3 text-sm font-medium">Find my size</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">Height (cm)<input inputMode="numeric" className="field mt-1" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, ""))} placeholder="175" /></label>
          {!kids && <label className="text-xs">Weight (kg)<input inputMode="numeric" className="field mt-1" value={w} onChange={(e) => setW(e.target.value.replace(/\D/g, ""))} placeholder="72" /></label>}
        </div>
        {rec && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm">We recommend <strong>{rec}</strong> for a {p.fit.toLowerCase()} fit.</p>
            <button className="btn btn-primary min-h-9 px-4" onClick={() => { onPick(rec); onClose(); }}>Select</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm uppercase tracking-[0.12em]">
        {title}
        <span className="text-lg transition-transform group-open:rotate-45" aria-hidden>+</span>
      </summary>
      <div className="pb-5 text-sm leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

function NotifyMe({ v }: { v: Variant }) {
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  if (done) return <p className="text-sm text-success">We’ll message you as soon as size {v.size} is back.</p>;
  return (
    <form
      className="flex"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch("/api/stock-alert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sku: v.sku, contact }) });
        if (r.ok) setDone(true);
      }}
    >
      <input className="field rounded-e-none" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or WhatsApp number" aria-label="Email or WhatsApp number for back-in-stock alert" />
      <button className="btn btn-secondary rounded-s-none whitespace-nowrap">Notify me</button>
    </form>
  );
}

export function ProductDetail({ p, initialColour }: { p: Product; initialColour?: string }) {
  const { add, wishlist, toggleWish, pushRecent, showToast } = useStore();
  const [colour, setColour] = useState(p.colours.find((c) => c.name === initialColour) ?? p.colours[0]);
  const oneSize = p.sizes.length === 1;
  const [size, setSize] = useState<string | null>(oneSize ? p.sizes[0] : null);
  const [qty, setQty] = useState(1);
  const [guide, setGuide] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [city, setCity] = useState("Lahore");
  const [copied, setCopied] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => pushRecent(p.id), [p.id, pushRecent]);

  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStickyVisible(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variants = p.variants.filter((v) => v.colour === colour.name);
  const variant = size ? variants.find((v) => v.size === size) : undefined;
  const available = (v?: Variant) => !!v && (v.stock > 0 || !!p.preOrder);
  const wished = wishlist.includes(p.id);
  const chart = chartFor(p);
  const url = `${SITE.url}/products/${p.slug}`;

  const addToBag = () => {
    if (!variant) {
      setSizeError(true);
      buyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!available(variant)) return;
    add(p.id, variant.sku, qty);
    showToast(`Added to bag · ${p.name} (${variant.size})`);
  };

  const waText = `Assalam-o-Alaikum! I'd like to order:\n${p.name}\nColour: ${colour.name}\nSize: ${size ?? "(please advise)"}\nQty: ${qty}\nPrice: ${formatPKR(p.price)}\n${url}`;

  return (
    <div className="grid gap-8 md:grid-cols-[1.15fr_1fr] lg:gap-14">
      <Gallery key={colour.name} product={p} colour={colour.name} />

      <div className="space-y-6">
        <div className="space-y-2">
          {p.preOrder && <p className="eyebrow text-gold">Pre-order · made to order</p>}
          <h1 className="text-3xl md:text-4xl">{p.name}</h1>
          {p.reviews.length > 0 && (
            <a href="#reviews" className="flex items-center gap-2 text-xs text-muted hover:text-ink">
              <Stars value={p.rating} /> {p.rating.toFixed(1)} · {p.reviews.length} review{p.reviews.length > 1 ? "s" : ""}
            </a>
          )}
          <PriceBlock price={p.price} compareAt={p.compareAt} size="lg" />
          <p className="text-xs text-muted">Inclusive of all taxes</p>
        </div>

        <div ref={buyRef} className="space-y-5">
          <div>
            <p className="mb-2 text-sm">Colour: <span className="text-muted">{colour.name}</span></p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {p.colours.map((c) => {
                const out = !p.preOrder && p.variants.filter((v) => v.colour === c.name).every((v) => v.stock === 0);
                return (
                  <button
                    key={c.name}
                    role="radio"
                    aria-checked={c.name === colour.name}
                    aria-label={`${c.name}${out ? " (sold out)" : ""}`}
                    onClick={() => setColour(c)}
                    className={`relative h-9 w-9 rounded-full border ${c.name === colour.name ? "ring-1 ring-ink ring-offset-2 ring-offset-ivory" : "border-line"} ${out ? "opacity-40" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                );
              })}
            </div>
          </div>

          {!oneSize && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className={`text-sm ${sizeError && !size ? "text-sale" : ""}`}>{sizeError && !size ? "Please select a size" : <>Size{size && <span className="text-muted">: {size}</span>}</>}</p>
                {chart && (
                  <button onClick={() => setGuide(true)} className="flex items-center gap-1 text-xs underline underline-offset-4"><RulerIcon width={16} /> Size guide</button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="radiogroup" aria-label="Size">
                {variants.map((v) => {
                  const ok = available(v);
                  return (
                    <button
                      key={v.sku}
                      role="radio"
                      aria-checked={size === v.size}
                      aria-label={`${v.size}${ok ? "" : " – sold out"}`}
                      onClick={() => { setSize(v.size); setSizeError(false); setQty(1); }}
                      className={`relative min-h-11 border text-sm ${size === v.size ? "border-ink bg-ink text-ivory" : ok ? "border-line bg-white hover:border-ink" : "border-line bg-cream text-muted"}`}
                    >
                      <span className={ok ? "" : "line-through"}>{v.size}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {variant && !p.preOrder && variant.stock > 0 && variant.stock <= 5 && (
            <p className="flex items-center gap-2 text-sm text-sale"><span className="h-2 w-2 rounded-full bg-sale" /> Only {variant.stock} left in this size</p>
          )}
          {variant && !p.preOrder && variant.stock > 5 && <p className="flex items-center gap-2 text-sm text-success"><span className="h-2 w-2 rounded-full bg-success" /> In stock, ready to ship</p>}
          {p.preOrder && <p className="bg-cream p-3 text-sm">Made to order. Expected dispatch in <strong>{p.preOrder.dispatch}</strong> after confirmation.</p>}

          {variant && !available(variant) ? (
            <div className="space-y-2">
              <p className="text-sm">Size {variant.size} in {colour.name} is sold out. Get notified when it’s back:</p>
              <NotifyMe v={variant} />
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex items-center border border-line bg-white">
                <button className="h-12 w-10" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="w-8 text-center tabular-nums" aria-live="polite">{qty}</span>
                <button className="h-12 w-10" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(variant && !p.preOrder ? Math.min(10, variant.stock) : 10, q + 1))}>+</button>
              </div>
              <button onClick={addToBag} className="btn btn-primary flex-1">{p.preOrder ? "Pre-order now" : "Add to bag"}</button>
              <button onClick={() => toggleWish(p.id)} className="btn btn-secondary px-3" aria-label={wished ? "Remove from wishlist" : "Add to wishlist"} aria-pressed={wished}>
                <HeartIcon filled={wished} className={wished ? "text-sale" : ""} />
              </button>
            </div>
          )}

          <a href={whatsappLink(waText)} target="_blank" rel="noopener noreferrer" className="btn w-full border border-[#1f7a4d] text-[#1f7a4d] hover:bg-[#1f7a4d] hover:text-white">
            <WhatsAppIcon /> Order on WhatsApp
          </a>
        </div>

        <div className="space-y-3 bg-cream p-4 text-sm">
          <div className="flex items-start gap-3">
            <TruckIcon className="mt-0.5 shrink-0 text-gold" />
            <div className="flex-1">
              <label className="flex flex-wrap items-center gap-2">
                Delivery to
                <select value={city} onChange={(e) => setCity(e.target.value)} className="border border-line bg-white px-2 py-1 text-sm">
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <p className="mt-1 text-muted">Estimated {deliveryEstimate(city)}{p.preOrder ? " after dispatch" : ""}. Free over Rs. 4,999.</p>
            </div>
          </div>
          <div className="flex items-start gap-3"><CashIcon className="shrink-0 text-gold" /><p>Cash on delivery available in {city}</p></div>
          <div className="flex items-start gap-3"><ReturnIcon className="shrink-0 text-gold" /><p>7-day exchange & returns on unworn items with tags. <Link href="/pages/returns" className="underline underline-offset-4">Policy</Link></p></div>
        </div>

        <div>
          <Accordion title="Description" open>
            <p>{p.description}</p>
          </Accordion>
          <Accordion title="Fabric & care">
            <p className="mb-2"><strong>Fabric:</strong> {p.fabric}</p>
            <ul className="list-disc space-y-1 ps-5">{p.care.map((c) => <li key={c}>{c}</li>)}</ul>
          </Accordion>
          <Accordion title="Fit & sizing">
            <p><strong>Fit:</strong> {p.fit}</p>
            {p.modelInfo && <p className="mt-1">{p.modelInfo}</p>}
            {chart && <button onClick={() => setGuide(true)} className="mt-2 underline underline-offset-4">Open size guide</button>}
          </Accordion>
          <Accordion title="Shipping & returns">
            <p>Delivered by our courier partners within 2–5 working days across Pakistan. Cash on delivery, cards, JazzCash, Easypaisa and bank transfer accepted. Exchanges within 7 days of delivery.</p>
          </Accordion>
        </div>

        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1 text-muted"><ShareIcon width={16} /> Share</span>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${p.name} ${url}`)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>
          <button onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }} className="uppercase hover:underline">{copied ? "Copied!" : "Copy link"}</button>
        </div>
      </div>

      <section id="reviews" className="md:col-span-2">
        <div className="border-t border-line pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Verified buyers</p>
              <h2 className="text-3xl">Reviews</h2>
            </div>
            {p.reviews.length > 0 && <p className="flex items-center gap-2 text-sm"><Stars value={p.rating} size={18} /> {p.rating.toFixed(1)} out of 5</p>}
          </div>
          {p.reviews.length ? (
            <ul className="grid gap-4 md:grid-cols-3">
              {p.reviews.map((r, i) => (
                <li key={i} className="space-y-2 bg-white p-5">
                  <Stars value={r.rating} />
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-ink-soft">{r.body}</p>
                  <p className="text-xs text-muted">{r.author}, {r.city} · {r.verified && "Verified buyer · "}{new Date(r.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No reviews yet. Bought this piece? You’ll get a review link after delivery.</p>
          )}
        </div>
      </section>

      {/* Sticky add-to-bag on mobile (BRD 3.3) */}
      {stickyVisible && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-ivory p-3 md:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{p.name}</p>
            <p className="text-xs text-muted">{formatPKR(p.price)}{size ? ` · ${size}` : ""}</p>
          </div>
          <button onClick={addToBag} className="btn btn-primary min-h-11 px-5">{size ? "Add to bag" : "Select size"}</button>
        </div>
      )}

      {guide && chart && <SizeGuide p={p} onClose={() => setGuide(false)} onPick={(s) => { setSize(s); setSizeError(false); }} />}
    </div>
  );
}
