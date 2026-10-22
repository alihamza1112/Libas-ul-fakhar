"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CITIES, deliveryEstimate, normalisePhone } from "@/lib/cities";
import { computeTotals, formatPKR } from "@/lib/pricing";
import type { PaymentMethod, SavedAddress } from "@/lib/types";
import { CouponField, TotalsTable } from "@/components/OrderSummary";
import { ProductPhoto } from "@/components/ProductPhoto";
import { useStore } from "@/components/StoreProvider";
import { ShieldIcon } from "@/components/Icons";

interface Form {
  phone: string;
  email: string;
  name: string;
  city: string;
  address: string;
  area: string;
  notes: string;
}

const PAYMENTS: { key: PaymentMethod | "card" | "jazzcash" | "easypaisa"; label: string; note: string; enabled: boolean }[] = [
  { key: "cod", label: "Cash on delivery", note: "Pay in cash when your parcel arrives.", enabled: true },
  { key: "bank", label: "Bank transfer / Raast", note: "Transfer after ordering — details shown on the next page. Ships once payment is confirmed.", enabled: true },
  { key: "card", label: "Debit / credit card", note: "Visa & Mastercard via secure hosted gateway — coming soon.", enabled: false },
  { key: "jazzcash", label: "JazzCash", note: "Coming soon.", enabled: false },
  { key: "easypaisa", label: "Easypaisa", note: "Coming soon.", enabled: false },
];

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-sale" role="alert">{msg}</p> : null;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutPage() {
  const { lines, ready, coupon, clear, account } = useStore();
  const router = useRouter();
  const [f, setF] = useState<Form>({ phone: "", email: "", name: "", city: "", address: "", area: "", notes: "" });
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  // One idempotency key per checkout attempt: retries and double-clicks can't create duplicates (FR-CHK-12).
  const [idemKey] = useState(newKey);
  const [stockIssues, setStockIssues] = useState<Record<string, number>>({});
  const [savedId, setSavedId] = useState<string>(""); // "" = typing a new address
  const [saveAddress, setSaveAddress] = useState(true);
  const [prefilled, setPrefilled] = useState(false);

  const pickSaved = (a: SavedAddress) => {
    setSavedId(a.id);
    setF((prev) => ({ ...prev, name: a.name, phone: a.phone, city: a.city, address: a.address, area: a.area ?? "" }));
    setErrors({});
  };

  // Signed in: fill the form once from the default address and profile (FR-ACC-05)
  useEffect(() => {
    if (!account || prefilled) return;
    const def = account.addresses.find((a) => a.isDefault) ?? account.addresses[0];
    /* eslint-disable react-hooks/set-state-in-effect -- one-time prefill when account data arrives */
    setPrefilled(true);
    setF((prev) => (prev.phone || prev.address ? prev : {
      ...prev,
      name: def?.name ?? account.name,
      phone: def?.phone ?? account.phone,
      email: prev.email || account.email,
      city: def?.city ?? "",
      address: def?.address ?? "",
      area: def?.area ?? "",
    }));
    if (def) setSavedId(def.id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [account, prefilled]);

  const totals = computeTotals(lines.map((l) => ({ unitPrice: l.product.price, qty: l.qty })), { coupon, city: f.city || undefined });

  // Live stock re-check on arrival (FR-CART-06)
  useEffect(() => {
    if (!ready || !lines.length) return;
    fetch("/api/cart/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: lines.map(({ productId, sku, qty }) => ({ productId, sku, qty })) }) })
      .then((r) => r.json())
      .then((j: { lines: { sku: string; stock: number }[] }) => {
        const issues: Record<string, number> = {};
        for (const x of j.lines) {
          const l = lines.find((y) => y.sku === x.sku);
          if (l && x.stock < l.qty) issues[x.sku] = x.stock;
        }
        setStockIssues(issues);
      })
      .catch(() => undefined);
  }, [ready, lines]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
    // Editing a saved address makes it a new one (which can then be saved)
    if (savedId && ["name", "phone", "city", "address", "area"].includes(k)) setSavedId("");
  };

  function validate(): boolean {
    const e: typeof errors = {};
    if (!normalisePhone(f.phone)) e.phone = "Enter a valid mobile number, e.g. 0300 1234567";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email";
    if (f.name.trim().length < 2) e.name = "Enter your full name";
    if (!f.city) e.city = "Choose your city";
    if (f.address.trim().length < 10) e.address = "Enter house no., street and area";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`f-${first}`)?.focus();
    return !first;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !validate()) return;
    if (Object.keys(stockIssues).length) {
      setErrors({ form: "Some items in your bag are no longer available in the quantity selected. Please update your bag." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idemKey,
          lines: lines.map(({ productId, sku, qty }) => ({ productId, sku, qty })),
          address: { name: f.name, phone: f.phone, email: f.email || undefined, city: f.city, address: f.address, area: f.area || undefined },
          payment,
          coupon: totals.couponApplied,
          notes: f.notes || undefined,
          saveAddress: !!account && !savedId && saveAddress,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErrors(j.field ? { [j.field]: j.error } : { form: j.error });
        setBusy(false);
        return;
      }
      clear();
      router.replace(`/order/${j.number}`);
    } catch {
      setErrors({ form: "Network error — please check your connection and try again. You won't be charged twice." });
      setBusy(false);
    }
  }

  if (ready && !lines.length && !busy) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-4xl">Your bag is empty</h1>
        <Link href="/" className="btn btn-primary mt-6">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-4xl">Checkout</h1>
      {account ? (
        <p className="mb-8 text-sm text-muted">Signed in as {account.name || account.phone || account.email}. This order will appear in <Link href="/account/orders" className="underline">your orders</Link>. <Link href="/cart" className="underline">Edit bag</Link></p>
      ) : (
        <p className="mb-8 text-sm text-muted">
          Guest checkout — no account needed. {account === null && <><Link href="/account/login?next=/checkout" className="underline">Sign in</Link> to use saved addresses. </>}
          <Link href="/cart" className="underline">Edit bag</Link>
        </p>
      )}

      <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="mb-4 font-display text-2xl">1. Contact</legend>
            <div>
              <label htmlFor="f-phone" className="mb-1 block text-sm">Mobile number *</label>
              <input id="f-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="03xx xxxxxxx" value={f.phone} onChange={set("phone")} aria-invalid={!!errors.phone} />
              <p className="mt-1 text-xs text-muted">For delivery updates by SMS/WhatsApp. Our courier will call before delivery.</p>
              <Err msg={errors.phone} />
            </div>
            <div>
              <label htmlFor="f-email" className="mb-1 block text-sm">Email (optional, for your receipt)</label>
              <input id="f-email" className="field" type="email" autoComplete="email" value={f.email} onChange={set("email")} aria-invalid={!!errors.email} />
              <Err msg={errors.email} />
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 font-display text-2xl">2. Delivery address</legend>
            {account && account.addresses.length > 0 && (
              <div className="space-y-2" role="radiogroup" aria-label="Saved addresses">
                {account.addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer gap-3 border p-3 text-sm ${savedId === a.id ? "border-ink bg-white" : "border-line bg-white/60"}`}>
                    <input type="radio" name="saved" className="mt-1 accent-ink" checked={savedId === a.id} onChange={() => pickSaved(a)} />
                    <span>
                      <span className="font-medium">{a.label || a.name}</span>{a.isDefault && <span className="ms-2 text-xs text-muted">Default</span>}
                      <span className="block text-ink-soft">{a.name} · {a.phone}<br />{a.address}{a.area ? `, ${a.area}` : ""}, {a.city}</span>
                    </span>
                  </label>
                ))}
                <label className={`flex cursor-pointer gap-3 border p-3 text-sm ${savedId === "" ? "border-ink bg-white" : "border-line bg-white/60"}`}>
                  <input type="radio" name="saved" className="mt-1 accent-ink" checked={savedId === ""} onChange={() => { setSavedId(""); setF((prev) => ({ ...prev, city: "", address: "", area: "" })); }} />
                  <span className="font-medium">Use a different address</span>
                </label>
              </div>
            )}
            <div>
              <label htmlFor="f-name" className="mb-1 block text-sm">Full name *</label>
              <input id="f-name" className="field" autoComplete="name" value={f.name} onChange={set("name")} aria-invalid={!!errors.name} />
              <Err msg={errors.name} />
            </div>
            <div>
              <label htmlFor="f-city" className="mb-1 block text-sm">City *</label>
              <select id="f-city" className="field" autoComplete="address-level2" value={f.city} onChange={set("city")} aria-invalid={!!errors.city}>
                <option value="">Select your city</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              {f.city && <p className="mt-1 text-xs text-success">Delivery in {deliveryEstimate(f.city)}</p>}
              <Err msg={errors.city} />
            </div>
            <div>
              <label htmlFor="f-address" className="mb-1 block text-sm">Complete address *</label>
              <textarea id="f-address" rows={2} className="field" autoComplete="street-address" placeholder="House #, street, block / sector, area" value={f.address} onChange={set("address")} aria-invalid={!!errors.address} />
              <Err msg={errors.address} />
            </div>
            <div>
              <label htmlFor="f-area" className="mb-1 block text-sm">Nearest landmark (optional)</label>
              <input id="f-area" className="field" placeholder="e.g. near Liberty Market" value={f.area} onChange={set("area")} />
            </div>
            {account && !savedId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-ink" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                Save this address to my account
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-4 font-display text-2xl">3. Payment</legend>
            <div className="divide-y divide-line border border-line bg-white">
              {PAYMENTS.map((p) => (
                <label key={p.key} className={`flex gap-3 p-4 ${p.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                  <input type="radio" name="payment" className="mt-1 accent-ink" disabled={!p.enabled} checked={payment === p.key} onChange={() => setPayment(p.key as PaymentMethod)} />
                  <span>
                    <span className="block text-sm font-medium">{p.label}</span>
                    <span className="text-xs text-muted">{p.note}</span>
                  </span>
                </label>
              ))}
            </div>
            <label htmlFor="f-notes" className="mb-1 mt-6 block text-sm">Order notes (optional)</label>
            <textarea id="f-notes" rows={2} className="field" placeholder="Delivery instructions, gift message…" value={f.notes} onChange={set("notes")} />
          </fieldset>
        </div>

        <aside className="h-fit space-y-5 bg-white p-6 lg:sticky lg:top-28">
          <h2 className="text-2xl">Order summary</h2>
          <ul className="divide-y divide-line">
            {lines.map((l) => {
              return (
                <li key={l.sku} className="flex gap-3 py-3">
                  <div className="relative shrink-0">
                    <ProductPhoto product={l.product} colour={l.variant.colour} sizes="64px" className="h-20 w-16" />
                    <span className="absolute -end-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] text-ivory">{l.qty}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="leading-snug">{l.product.name}</p>
                    <p className="text-xs text-muted">{l.variant.colour} · {l.variant.size}</p>
                    {stockIssues[l.sku] !== undefined && <p className="text-xs text-sale">{stockIssues[l.sku] === 0 ? "Sold out" : `Only ${stockIssues[l.sku]} left`} — <Link href="/cart" className="underline">update bag</Link></p>}
                  </div>
                  <p className="text-sm">{formatPKR(l.product.price * l.qty)}</p>
                </li>
              );
            })}
          </ul>
          <CouponField />
          <TotalsTable totals={totals} cityKnown={!!f.city} />
          {errors.form && <p className="bg-sale/10 p-3 text-sm text-sale" role="alert">{errors.form}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !ready}>
            {busy ? "Placing order…" : `Place order · ${formatPKR(totals.total)}`}
          </button>
          <p className="flex items-center gap-2 text-xs text-muted"><ShieldIcon width={16} /> By placing your order you agree to our <Link href="/pages/terms" className="underline">terms</Link> and <Link href="/pages/privacy" className="underline">privacy policy</Link>.</p>
        </aside>
      </form>
    </div>
  );
}
