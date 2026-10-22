"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { COLOUR_SWATCHES, DEPARTMENTS, GARMENTS, SIZE_PRESETS, slugify } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { formatPkt, isoToPktLocal, pktLocalToIso, saleState, salePriceForPercent } from "@/lib/productPricing";
import { autoSku, type FieldErrors, type ProductInput } from "@/lib/productInput";
import type { Garment } from "@/lib/types";
import Image from "next/image";
import { ProductArt } from "@/components/ProductArt";
import { PhotoManager, type EditorImage } from "./PhotoManager";
import { saveProductAction } from "../../products-actions";

interface ColourRow {
  key: string;
  name: string;
  hex: string;
}

let keySeq = 0;
const newKey = () => `c${++keySeq}`;

const SALE_BADGE: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-900",
  scheduled: "bg-sky-100 text-sky-900",
  ended: "bg-stone-200 text-muted",
};

export function ProductEditor({ initial, productId, previewNow }: { initial: ProductInput; productId?: string; previewNow: number }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  const [f, setF] = useState({
    name: initial.name,
    slug: initial.slug ?? "",
    status: String(initial.status),
    department: String(initial.department),
    category: initial.category,
    garment: String(initial.garment),
    basePrice: String(initial.basePrice ?? ""),
    fabric: initial.fabric,
    fit: initial.fit,
    description: initial.description,
    care: Array.isArray(initial.care) ? initial.care.join("\n") : initial.care,
    tags: Array.isArray(initial.tags) ? initial.tags.join(", ") : initial.tags,
    modelInfo: initial.modelInfo ?? "",
    preOrderDispatch: initial.preOrderDispatch ?? "",
  });
  const [slugTouched, setSlugTouched] = useState(!!productId);

  const [onSale, setOnSale] = useState(initial.salePrice !== "" && initial.salePrice !== undefined && initial.salePrice !== null);
  const [sale, setSale] = useState({
    price: onSale ? String(initial.salePrice) : "",
    startsAt: isoToPktLocal(initial.saleStartsAt) || "",
    endsAt: isoToPktLocal(initial.saleEndsAt) || "",
  });

  const [colours, setColours] = useState<ColourRow[]>(() => initial.colours.map((c) => ({ key: newKey(), name: c.name, hex: c.hex })));
  const [images, setImages] = useState<EditorImage[]>(() =>
    (initial.images ?? []).map((img) => ({ ...img, colourKey: colours.find((c) => c.name === img.colour)?.key ?? null })),
  );
  const [sizes, setSizes] = useState<string[]>(initial.sizes);
  const [newSize, setNewSize] = useState("");
  const [cells, setCells] = useState<Record<string, { sku: string; stock: string }>>(() => {
    const m: Record<string, { sku: string; stock: string }> = {};
    initial.variants.forEach((v) => {
      const c = colours.find((x) => x.name === v.colour);
      if (c) m[`${c.key}|${v.size}`] = { sku: v.sku ?? "", stock: String(v.stock) };
    });
    return m;
  });
  const [showSkus, setShowSkus] = useState(false);
  const [fillAll, setFillAll] = useState("");

  const dept = DEPARTMENTS.find((d) => d.slug === f.department);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setF((prev) => {
      const next = { ...prev, [k]: value };
      if (k === "department") next.category = DEPARTMENTS.find((d) => d.slug === value)?.categories[0]?.slug ?? "";
      if (!slugTouched && (k === "name" || k === "department")) next.slug = next.name ? `${slugify(next.name)}-${next.department}` : "";
      return next;
    });
  };

  const basePaisa = Math.round(Number(f.basePrice.replace(/,/g, "")) * 100) || 0;
  const salePaisa = Math.round(Number(sale.price.replace(/,/g, "")) * 100) || 0;
  const schedule = onSale && salePaisa ? { price: salePaisa, startsAt: pktLocalToIso(sale.startsAt), endsAt: pktLocalToIso(sale.endsAt) } : undefined;
  const state = saleState(schedule, previewNow);
  const pct = basePaisa && salePaisa ? Math.round(((basePaisa - salePaisa) / basePaisa) * 100) : 0;
  const totalStock = useMemo(() => Object.entries(cells).filter(([k]) => colours.some((c) => k.startsWith(`${c.key}|`)) && sizes.some((s) => k.endsWith(`|${s}`))).reduce((s, [, v]) => s + (Number(v.stock) || 0), 0), [cells, colours, sizes]);

  const cell = (c: ColourRow, size: string) => cells[`${c.key}|${size}`] ?? { sku: "", stock: "0" };
  const setCell = (c: ColourRow, size: string, patch: Partial<{ sku: string; stock: string }>) => {
    setCells((m) => ({ ...m, [`${c.key}|${size}`]: { ...cell(c, size), ...patch } }));
  };

  const addSize = (s: string) => {
    const v = s.trim();
    if (v && !sizes.includes(v)) setSizes([...sizes, v]);
    setNewSize("");
  };

  function buildInput(): ProductInput {
    return {
      id: productId,
      ...f,
      salePrice: onSale ? sale.price : "",
      saleStartsAt: onSale ? sale.startsAt : "",
      saleEndsAt: onSale ? sale.endsAt : "",
      colours: colours.map(({ name, hex }) => ({ name, hex })),
      sizes,
      variants: colours.flatMap((c) => sizes.map((size) => ({ colour: c.name, size, sku: cell(c, size).sku, stock: cell(c, size).stock }))),
      // Stored grouped: each colour's photos in colour order, then shared ones
      images: [...colours.map((c) => c.key), null].flatMap((key) =>
        images
          .filter((img) => img.colourKey === key)
          .map((img) => ({ id: img.id, url: img.url, width: img.width, height: img.height, colour: colours.find((c) => c.key === key)?.name || undefined, alt: img.alt?.trim() || undefined })),
      ),
    };
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const res = await saveProductAction(buildInput());
      if (!res.ok) {
        setErrors(res.errors);
        document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setErrors({});
      // The page re-renders with fresh data and shows the confirmation banner
      router.replace(`/admin/products/${res.id}?${productId ? "saved" : "created"}=${Date.now()}`, { scroll: false });
    });
  }

  const previewColour = colours[0] ?? { key: "", hex: "#D8C3A5", name: "" };
  const previewPhoto = images.find((i) => i.colourKey === previewColour.key) ?? images.find((i) => i.colourKey === null);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="space-y-6">
        <Section title="Basics">
          <Field label="Product name *" htmlFor="p-name">
            <input id="p-name" className="field" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} />
            <Err msg={errors.name} />
          </Field>
          <Field label="URL handle" htmlFor="p-slug" hint={`/products/${f.slug || "…"}`}>
            <input id="p-slug" className="field font-mono text-sm" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug")(e); }} aria-invalid={!!errors.slug} />
            <Err msg={errors.slug} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department *" htmlFor="p-dept">
              <select id="p-dept" className="field" value={f.department} onChange={set("department")}>
                {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
              </select>
              <Err msg={errors.department} />
            </Field>
            <Field label="Category *" htmlFor="p-cat">
              <select id="p-cat" className="field" value={f.category} onChange={set("category")} aria-invalid={!!errors.category}>
                {dept?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.label} ({c.group})</option>)}
              </select>
              <Err msg={errors.category} />
            </Field>
            <Field label="Status" htmlFor="p-status" hint="Only active products appear on the store.">
              <select id="p-status" className="field" value={f.status} onChange={set("status")}>
                <option value="active">Active – visible on store</option>
                <option value="draft">Draft – hidden</option>
                <option value="archived">Archived – hidden, kept for orders</option>
              </select>
            </Field>
            <Field label="Image style" htmlFor="p-garment" hint="Placeholder art until photography is uploaded.">
              <select id="p-garment" className="field" value={f.garment} onChange={set("garment")}>
                {GARMENTS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Pricing & sale">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Regular price (Rs.) *" htmlFor="p-price">
              <input id="p-price" className="field tabular-nums" inputMode="numeric" value={f.basePrice} onChange={set("basePrice")} aria-invalid={!!errors.basePrice} />
              <Err msg={errors.basePrice} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ink" checked={onSale} onChange={(e) => { setOnSale(e.target.checked); }} />
            Put this product on sale
          </label>
          {onSale && (
            <div className="space-y-4 border-s-2 border-sale ps-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sale price (Rs.) *" htmlFor="p-sale">
                  <input id="p-sale" className="field tabular-nums" inputMode="numeric" value={sale.price} onChange={(e) => setSale({ ...sale, price: e.target.value })} aria-invalid={!!errors.salePrice} />
                  <Err msg={errors.salePrice} />
                </Field>
                <div>
                  <p className="mb-1 text-sm">Quick discount</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 30, 40, 50].map((p) => (
                      <button key={p} type="button" disabled={!basePaisa} onClick={() => setSale({ ...sale, price: String(salePriceForPercent(basePaisa, p) / 100) })} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs hover:border-ink disabled:opacity-40">
                        −{p}%
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Starts (Pakistan time)" htmlFor="p-start" hint="Leave empty to start immediately.">
                  <input id="p-start" type="datetime-local" className="field" value={sale.startsAt} onChange={(e) => setSale({ ...sale, startsAt: e.target.value })} aria-invalid={!!errors.saleStartsAt} />
                  <Err msg={errors.saleStartsAt} />
                </Field>
                <Field label="Ends (Pakistan time)" htmlFor="p-end" hint="Price reverts automatically. Empty = until removed.">
                  <input id="p-end" type="datetime-local" className="field" value={sale.endsAt} onChange={(e) => setSale({ ...sale, endsAt: e.target.value })} aria-invalid={!!errors.saleEndsAt} />
                  <Err msg={errors.saleEndsAt} />
                </Field>
              </div>
              {schedule && (
                <p className="text-sm">
                  <span className={`me-2 rounded-full px-2 py-0.5 text-xs ${SALE_BADGE[state] ?? ""}`}>{state === "live" ? "Live now" : state === "scheduled" ? "Scheduled" : "Ended"}</span>
                  {pct > 0 && <>{pct}% off · customers save {formatPKR(basePaisa - salePaisa)}. </>}
                  {state === "scheduled" && schedule.startsAt && <>Starts {formatPkt(schedule.startsAt)}. </>}
                  {schedule.endsAt && state !== "ended" && <>Ends {formatPkt(schedule.endsAt)}.</>}
                  {state === "ended" && <>This sale has ended; the regular price is showing.</>}
                </p>
              )}
            </div>
          )}
        </Section>

        <Section title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fabric *" htmlFor="p-fabric">
              <input id="p-fabric" className="field" value={f.fabric} onChange={set("fabric")} aria-invalid={!!errors.fabric} />
              <Err msg={errors.fabric} />
            </Field>
            <Field label="Fit" htmlFor="p-fit">
              <input id="p-fit" className="field" value={f.fit} onChange={set("fit")} list="fits" />
              <datalist id="fits">{["Regular", "Slim", "Relaxed", "Straight", "A-line", "Wide", "Flared", "One size"].map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
          </div>
          <Field label="Description *" htmlFor="p-desc">
            <textarea id="p-desc" rows={4} className="field" value={f.description} onChange={set("description")} aria-invalid={!!errors.description} />
            <Err msg={errors.description} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Care instructions" htmlFor="p-care" hint="One per line.">
              <textarea id="p-care" rows={3} className="field" value={f.care} onChange={set("care")} />
            </Field>
            <div className="space-y-4">
              <Field label="Tags" htmlFor="p-tags" hint="Comma separated. Used by search (e.g. eid, wedding, summer).">
                <input id="p-tags" className="field" value={f.tags} onChange={set("tags")} />
              </Field>
              <Field label="Model info" htmlFor="p-model">
                <input id="p-model" className="field" placeholder={`Model is 6'0" and wears size M`} value={f.modelInfo} onChange={set("modelInfo")} />
              </Field>
            </div>
          </div>
          <Field label="Pre-order / made to order" htmlFor="p-pre" hint='Dispatch time shown to customers, e.g. "7–10 days". Leave empty for ready stock. Pre-order items can be sold beyond stock.'>
            <input id="p-pre" className="field" value={f.preOrderDispatch} onChange={set("preOrderDispatch")} />
          </Field>
        </Section>

        <Section title="Colours & sizes">
          <div>
            <p className="mb-2 text-sm">Colours *</p>
            <ul className="space-y-2">
              {colours.map((c, i) => (
                <li key={c.key} className="flex items-center gap-2">
                  <input type="color" aria-label={`${c.name || "Colour"} swatch`} value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#000000"} onChange={(e) => setColours(colours.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)))} className="h-10 w-10 cursor-pointer border border-line bg-white p-0.5" />
                  <input className="field min-h-10 flex-1 py-1" placeholder="Colour name" aria-label="Colour name" value={c.name} onChange={(e) => setColours(colours.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="field min-h-10 w-28 py-1 font-mono text-xs" aria-label="Hex" value={c.hex} onChange={(e) => setColours(colours.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} />
                  <button type="button" onClick={() => {
                    setColours(colours.filter((_, j) => j !== i));
                    // Its photos stay, moved to "All colours"
                    setImages(images.map((img) => (img.colourKey === c.key ? { ...img, colourKey: null } : img)));
                  }} className="px-2 text-sm text-muted hover:text-sale" aria-label={`Remove ${c.name}`}>Remove</button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">Add:</span>
              {COLOUR_SWATCHES.filter((s) => !colours.some((c) => c.name.toLowerCase() === s.name.toLowerCase())).map((s) => (
                <button key={s.name} type="button" onClick={() => setColours([...colours, { key: newKey(), ...s }])} className="flex items-center gap-1 rounded-full border border-line bg-white px-2 py-1 text-xs hover:border-ink">
                  <span className="h-3 w-3 rounded-full border border-line" style={{ backgroundColor: s.hex }} /> {s.name}
                </button>
              ))}
              <button type="button" onClick={() => setColours([...colours, { key: newKey(), name: "", hex: "#888888" }])} className="rounded-full border border-dashed border-ink px-2 py-1 text-xs">+ Custom</button>
            </div>
            <Err msg={errors.colours} />
          </div>

          <div>
            <p className="mb-2 text-sm">Sizes *</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {sizes.map((s) => (
                <span key={s} className="flex items-center gap-1 border border-ink bg-white px-2 py-1 text-sm">
                  {s}
                  <button type="button" onClick={() => setSizes(sizes.filter((x) => x !== s))} aria-label={`Remove size ${s}`} className="text-muted hover:text-sale">×</button>
                </span>
              ))}
              <input
                className="field min-h-9 w-28 py-1 text-sm"
                placeholder="Add size"
                aria-label="Add size"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(newSize); } }}
              />
              <button type="button" onClick={() => addSize(newSize)} className="text-xs underline">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted">Presets:</span>
              {SIZE_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => setSizes(p.sizes)} className="rounded-full border border-line bg-white px-2 py-1 text-xs hover:border-ink">{p.label}</button>
              ))}
            </div>
            <Err msg={errors.sizes} />
          </div>
        </Section>

        <Section title="Photos">
          <PhotoManager images={images} onChange={setImages} colours={colours} />
          <Err msg={errors.images} />
        </Section>

        <Section title="Stock by variant">
          {colours.length && sizes.length ? (
            <>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  Set every variant to
                  <input className="field min-h-9 w-20 py-1" inputMode="numeric" value={fillAll} onChange={(e) => setFillAll(e.target.value.replace(/\D/g, ""))} aria-label="Stock for every variant" />
                </label>
                <button type="button" className="text-xs underline" disabled={!fillAll} onClick={() => { const m = { ...cells }; colours.forEach((c) => sizes.forEach((s) => { m[`${c.key}|${s}`] = { ...cell(c, s), stock: fillAll }; })); setCells(m); }}>Apply</button>
                <label className="ms-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={showSkus} onChange={(e) => setShowSkus(e.target.checked)} /> Edit SKUs</label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink">
                      <th className="py-2 text-start font-normal text-muted">Colour \ size</th>
                      {sizes.map((s) => <th key={s} className="px-1 py-2 text-center font-medium">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {colours.map((c) => (
                      <tr key={c.key} className="border-b border-line align-top">
                        <td className="py-2 pe-2"><span className="flex items-center gap-2 whitespace-nowrap"><span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: c.hex }} />{c.name || "—"}</span></td>
                        {sizes.map((s) => {
                          const v = cell(c, s);
                          return (
                            <td key={s} className="px-1 py-1.5">
                              <input
                                className={`w-full min-w-14 border px-2 py-1.5 text-center tabular-nums ${Number(v.stock) === 0 ? "border-sale/50 bg-sale/5" : "border-line bg-white"}`}
                                inputMode="numeric"
                                value={v.stock}
                                onChange={(e) => setCell(c, s, { stock: e.target.value.replace(/\D/g, "") })}
                                aria-label={`Stock for ${c.name} ${s}`}
                              />
                              {showSkus && (
                                <input
                                  className="mt-1 w-full min-w-28 border border-line bg-white px-1 py-1 font-mono text-[10px] uppercase"
                                  placeholder={autoSku(productId ?? "pNEW", c.name || "COL", s)}
                                  value={v.sku}
                                  onChange={(e) => setCell(c, s, { sku: e.target.value.toUpperCase() })}
                                  aria-label={`SKU for ${c.name} ${s}`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted">Empty SKUs are generated on save. Removing a colour or size removes those variants; past orders keep their own copy.</p>
            </>
          ) : (
            <p className="text-sm text-muted">Add at least one colour and one size to set stock.</p>
          )}
          <Err msg={errors.variants} />
        </Section>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-6">
        <div className="bg-white p-5">
          <p className="eyebrow mb-3">Preview</p>
          <div className="relative">
            {previewPhoto ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
                <Image src={previewPhoto.url} alt="" fill sizes="280px" className="object-cover" />
              </div>
            ) : (
              <ProductArt garment={f.garment as Garment} hex={/^#[0-9a-f]{6}$/i.test(previewColour.hex) ? previewColour.hex : "#D8C3A5"} embroidered={/embroider/i.test(f.tags)} className="aspect-[4/5] w-full" />
            )}
            {state === "live" && pct > 0 && <span className="absolute start-2 top-2 bg-sale px-2 py-0.5 text-[11px] font-medium text-white">-{pct}%</span>}
            {f.status !== "active" && <span className="absolute end-2 top-2 bg-ink px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ivory">{f.status}</span>}
          </div>
          <p className="mt-3 text-sm">{f.name || "Untitled product"}</p>
          <p className="text-sm">
            {state === "live" && salePaisa ? <><span className="font-medium text-sale">{formatPKR(salePaisa)}</span> <s className="text-muted">{formatPKR(basePaisa)}</s></> : basePaisa ? formatPKR(basePaisa) : "—"}
          </p>
          <p className="mt-2 text-xs text-muted">{colours.length} colour(s) · {sizes.length} size(s) · {totalStock} in stock</p>
        </div>
        <div className="space-y-3 bg-white p-5">
          {Object.keys(errors).length > 0 && (
            <div className="bg-sale/10 p-3 text-sm text-sale" role="alert">
              <p className="font-medium">Please fix {Object.keys(errors).length} problem(s):</p>
              <ul className="mt-1 list-disc ps-5 text-xs">{Object.values(errors).map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          <button className="btn btn-primary w-full" disabled={saving}>{saving ? "Saving…" : productId ? "Save changes" : "Create product"}</button>
          {productId && f.status === "active" && f.slug && <Link href={`/products/${f.slug}`} target="_blank" className="btn btn-secondary w-full">View on store ↗</Link>}
          <Link href="/admin/products" className="block text-center text-xs underline">Back to products</Link>
        </div>
      </aside>
    </form>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p data-error className="mt-1 text-xs text-sale" role="alert">{msg}</p> : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 bg-white p-5">
      <h2 className="text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
