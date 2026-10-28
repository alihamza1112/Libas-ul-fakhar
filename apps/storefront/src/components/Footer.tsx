"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { SITE, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./Icons";
import { useStore } from "./StoreProvider";

export function Newsletter({ dark = false }: { dark?: boolean }) {
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const r = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact, consent }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setState("done");
    else {
      setState("error");
      setError(j.error ?? "Something went wrong.");
    }
  }

  if (state === "done") return <p className="text-sm">Welcome to the family. Your code <strong>WELCOME10</strong> is on its way.</p>;
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex">
        <input
          className={`field rounded-e-none ${dark ? "border-ivory/30 bg-transparent text-ivory placeholder:text-ivory/50" : ""}`}
          placeholder="Email or WhatsApp number"
          aria-label="Email or WhatsApp number"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
        <button className={`btn rounded-s-none ${dark ? "bg-ivory text-ink" : "btn-primary"}`} disabled={state === "busy"}>Join</button>
      </div>
      <label className="flex items-start gap-2 text-xs opacity-80">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" required />
        <span>I agree to receive offers and updates. Unsubscribe anytime. See our <Link href="/pages/privacy" className="underline">privacy policy</Link>.</span>
      </label>
      {state === "error" && <p className="text-xs text-rose-beige" role="alert">{error}</p>}
    </form>
  );
}

const PAY = ["Cash on Delivery", "Visa", "Mastercard", "JazzCash", "Easypaisa", "Raast"];

export function Footer() {
  return (
    <footer className="mt-20 bg-ink text-ivory">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Image src="/brand/logo-full-light.png" alt={SITE.name} width={958} height={439} className="h-16 w-auto" />
          <p className="max-w-xs text-sm text-ivory/70">Modern heritage clothing, crafted in Pakistan and worn with pride.</p>
          <div>
            <p className="eyebrow mb-3 text-ivory/60">Get 10% off your first order</p>
            <Newsletter dark />
          </div>
        </div>
        <FooterCol title="Shop" links={[...DEPARTMENTS.map((d) => [d.label, `/collections/${d.slug}`] as [string, string]), ["New In", "/collections/new-arrivals"], ["Sale", "/collections/sale"]]} />
        <FooterCol
          title="Help"
          links={[
            ["Track your order", "/track"],
            ["Shipping & delivery", "/pages/shipping"],
            ["Exchange & returns", "/pages/returns"],
            ["Size guide", "/pages/size-guide"],
            ["FAQs", "/pages/faqs"],
            ["Contact us", "/pages/contact"],
          ]}
        />
        <div className="space-y-6">
          <FooterCol
            title="About"
            links={[
              ["Our story", "/pages/about"],
              ["Store locator", "/pages/stores"],
              ["Terms & conditions", "/pages/terms"],
              ["Privacy policy", "/pages/privacy"],
              ["Cancellation policy", "/pages/cancellation"],
            ]}
          />
          <div className="text-sm text-ivory/70">
            <p><a href={SITE.phoneHref} className="hover:text-ivory hover:underline">{SITE.phone}</a></p>
            <p><a href={`mailto:${SITE.email}`} className="hover:text-ivory hover:underline">{SITE.email}</a></p>
            <p>{SITE.hours}</p>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-ivory/60 md:flex-row md:items-center md:justify-between">
          <p>© 2026 {SITE.name}. All rights reserved.</p>
          <ul className="flex flex-wrap gap-2" aria-label="Payment methods">
            {PAY.map((p) => <li key={p} className="rounded-sm border border-ivory/25 px-2 py-1">{p}</li>)}
          </ul>
          <div className="flex flex-wrap gap-4">
            <a href={SITE.social.whatsappChannel} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">WhatsApp Channel</a>
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">Instagram</a>
            <a href={SITE.social.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">Facebook</a>
            <a href={SITE.social.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-ivory">TikTok</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-ivory/60">{title}</p>
      <ul className="space-y-2.5 text-sm">
        {links.map(([l, h]) => (
          <li key={h}><Link href={h} className="text-ivory/85 hover:text-ivory hover:underline underline-offset-4">{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink("Assalam-o-Alaikum! I have a question about Libas-ul-Fakhar.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 end-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1f7a4d] text-white shadow-lg transition hover:scale-105 max-md:bottom-20"
      aria-label="Chat with us on WhatsApp"
    >
      <WhatsAppIcon width={28} height={28} />
    </a>
  );
}

export function Toast() {
  const { toast } = useStore();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      {toast && <p className="rounded-sm bg-ink px-4 py-3 text-sm text-ivory shadow-lg">{toast}</p>}
    </div>
  );
}
