"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEPARTMENTS, GIFTS } from "@/lib/catalog";
import { formatPKR } from "@/lib/pricing";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/search";
import { SITE } from "@/lib/site";
import { useStore } from "./StoreProvider";
import { useCatalog } from "./CatalogProvider";
import { ProductPhoto } from "./ProductPhoto";
import { BagIcon, ChevronIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";

function Countdown() {
  const [left, setLeft] = useState<string>("");
  useEffect(() => {
    const end = new Date(SITE.saleEndsAt).getTime();
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms / 3600000) % 24);
      const m = Math.floor((ms / 60000) % 60);
      const s = Math.floor((ms / 1000) % 60);
      setLeft(ms ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s` : "");
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left ? <span className="tabular-nums">· ends in {left}</span> : null;
}

export function AnnouncementBar() {
  return (
    <div className="bg-ink text-ivory text-[0.72rem] tracking-[0.14em] uppercase">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center">
        <Link href="/collections/sale" className="hover:underline">
          Festive Sale — up to 50% off <Countdown />
        </Link>
        <span className="hidden sm:inline opacity-60">|</span>
        <span className="hidden sm:inline">Free delivery over Rs. 4,999 · Cash on delivery nationwide</span>
      </div>
    </div>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { products } = useCatalog();
  const results = useMemo(() => (q.trim().length >= 2 ? searchProducts(products, q).slice(0, 6) : []), [q, products]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (term: string) => {
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close search" onClick={onClose} />
      <div className="relative bg-ivory shadow-xl">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) go(q.trim());
            }}
            className="flex items-center gap-3 border-b border-ink pb-2"
          >
            <SearchIcon />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search "kurta", "shalwar kameez", "black shirt under 3000"'
              className="flex-1 bg-transparent py-2 text-lg outline-none placeholder:text-muted/70"
              aria-label="Search products"
            />
            <button type="button" onClick={onClose} aria-label="Close search" className="p-1">
              <CloseIcon />
            </button>
          </form>

          {q.trim().length < 2 ? (
            <div className="py-5">
              <p className="eyebrow mb-3">Popular searches</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button key={s} onClick={() => go(s)} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length ? (
            <ul className="divide-y divide-line py-2">
              {results.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.slug}`} onClick={onClose} className="flex items-center gap-4 py-3 hover:bg-cream">
                    <ProductPhoto product={p} colour={p.colours[0]?.name} sizes="52px" className="h-16 w-13 shrink-0" />
                    <span className="flex-1">
                      <span className="block text-sm">{p.name}</span>
                      <span className="text-xs capitalize text-muted">{p.department}</span>
                    </span>
                    <span className="text-sm">{formatPKR(p.price)}</span>
                  </Link>
                </li>
              ))}
              <li className="pt-3">
                <button onClick={() => go(q)} className="text-sm underline underline-offset-4">
                  See all results for “{q}”
                </button>
              </li>
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted">No matches for “{q}”. Try “kurta”, “waistcoat” or “shawl”.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Isolated so reading the URL doesn't block prerendering of the whole header. */
function RouteWatcher({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  useEffect(() => onChange(), [pathname, onChange]);
  return null;
}

export function Header() {
  const { count, wishlist, setDrawerOpen, ready, account } = useStore();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState<string | null>(null);
  const [mobileDept, setMobileDept] = useState<string | null>(null);
  const closeOverlays = useCallback(() => {
    setMenu(false);
    setMega(null);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu || search ? "hidden" : "";
  }, [menu, search]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteWatcher onChange={closeOverlays} />
      </Suspense>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur" onMouseLeave={() => setMega(null)}>
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 py-2 lg:py-3">
          <div className="flex items-center gap-1">
            <button className="p-2 lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
              <MenuIcon />
            </button>
            <button className="p-2" aria-label="Search" onClick={() => setSearch(true)}>
              <SearchIcon />
            </button>
          </div>
          <Link href="/" aria-label={`${SITE.name} home`} className="block">
            <Image src="/brand/logo-full.png" alt={SITE.name} width={958} height={439} preload className="h-11 w-auto lg:h-14" />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <Link href="/account" className="relative hidden p-2 sm:block" aria-label={account ? `My account (signed in as ${account.name || account.phone || account.email})` : "Sign in"} title={account ? "My account" : "Sign in"}>
              <UserIcon />
              {account && <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-success ring-2 ring-ivory" aria-hidden />}
            </Link>
            <Link href="/wishlist" className="relative p-2" aria-label={`Wishlist, ${wishlist.length} items`}>
              <HeartIcon />
              {ready && wishlist.length > 0 && <Badge n={wishlist.length} />}
            </Link>
            <button className="relative p-2" aria-label={`Bag, ${count} items`} onClick={() => setDrawerOpen(true)}>
              <BagIcon />
              {ready && count > 0 && <Badge n={count} />}
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-line lg:block" aria-label="Departments">
          <ul className="mx-auto flex max-w-7xl justify-center gap-10 px-4">
            {DEPARTMENTS.map((d) => (
              <li key={d.slug} onMouseEnter={() => setMega(d.slug)} onFocus={() => setMega(d.slug)}>
                <Link href={`/collections/${d.slug}`} className="block py-3 text-[0.8rem] uppercase tracking-[0.18em] hover:text-gold" aria-expanded={mega === d.slug}>
                  {d.label}
                </Link>
              </li>
            ))}
            <li onMouseEnter={() => setMega(null)}>
              <Link href="/collections/new-arrivals" className="block py-3 text-[0.8rem] uppercase tracking-[0.18em] hover:text-gold">New In</Link>
            </li>
            <li onMouseEnter={() => setMega(null)}>
              <Link href="/collections/sale" className="block py-3 text-[0.8rem] uppercase tracking-[0.18em] text-sale">Sale</Link>
            </li>
          </ul>
        </nav>

        {mega && <MegaMenu dept={mega} />}
      </header>

      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col bg-ivory">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Image src="/brand/logo-latin.png" alt={SITE.name} width={936} height={127} className="h-5 w-auto" />
              <button onClick={() => setMenu(false)} aria-label="Close menu" className="p-2"><CloseIcon /></button>
            </div>
            <ul className="flex-1 overflow-y-auto px-4">
              {DEPARTMENTS.map((d) => (
                <li key={d.slug} className="border-b border-line">
                  <button
                    className="flex w-full items-center justify-between py-4 text-sm uppercase tracking-[0.16em]"
                    onClick={() => setMobileDept(mobileDept === d.slug ? null : d.slug)}
                    aria-expanded={mobileDept === d.slug}
                  >
                    {d.label}
                    <ChevronIcon className={`transition-transform ${mobileDept === d.slug ? "rotate-90" : ""}`} />
                  </button>
                  {mobileDept === d.slug && (
                    <ul className="pb-3 ps-3">
                      <li><Link href={`/collections/${d.slug}`} className="block py-2 text-sm font-medium">Shop all {d.label}</Link></li>
                      {d.categories.map((c) => (
                        <li key={c.slug}>
                          <Link href={`/collections/${d.slug}?category=${c.slug}`} className="block py-2 text-sm text-muted">{c.label}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li className="border-b border-line"><Link href="/collections/new-arrivals" className="block py-4 text-sm uppercase tracking-[0.16em]">New In</Link></li>
              <li className="border-b border-line"><Link href="/collections/sale" className="block py-4 text-sm uppercase tracking-[0.16em] text-sale">Sale</Link></li>
            </ul>
            <div className="space-y-1 border-t border-line p-4 text-sm">
              <Link href="/account" className="block py-2">{account ? "My account" : "Sign in / create account"}</Link>
              <Link href="/track" className="block py-2">Track your order</Link>
              <Link href="/pages/contact" className="block py-2">Help & contact</Link>
            </div>
          </div>
        </div>
      )}

      {search && <SearchPanel onClose={() => setSearch(false)} />}
    </>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] leading-none text-ivory">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function MegaMenu({ dept }: { dept: string }) {
  const d = DEPARTMENTS.find((x) => x.slug === dept)!;
  const groups = ["Eastern", "Western", "Accessories"] as const;
  const { products } = useCatalog();
  if (dept === GIFTS) return <GiftMenu />;
  const featured = products.filter((p) => p.department === dept).sort((a, b) => a.salesRank - b.salesRank)[0];
  return (
    <div className="absolute inset-x-0 top-full hidden border-b border-line bg-ivory shadow-lg lg:block">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_1fr_1fr_280px] gap-10 px-8 py-8">
        {groups.map((g) => {
          const cats = d.categories.filter((c) => c.group === g);
          return (
            <div key={g}>
              <p className="eyebrow mb-3">{g === "Eastern" ? "Eastern Wear" : g === "Western" ? "Western Wear" : "Accessories"}</p>
              {cats.length ? (
                <ul className="space-y-2">
                  {cats.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/collections/${d.slug}?category=${c.slug}`} className="text-sm hover:underline underline-offset-4">{c.label}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Coming soon</p>
              )}
            </div>
          );
        })}
        {featured && (
          <Link href={`/products/${featured.slug}`} className="group block">
            <ProductPhoto product={featured} colour={featured.colours[0]?.name} sizes="280px" className="aspect-[4/5] w-full" />
            <p className="mt-2 font-display text-lg">{d.tagline}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted group-hover:text-ink">Shop {d.label} →</p>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Mega-menu panel for Tohfa-e-Khaas: the gift boxes themselves. */
function GiftMenu() {
  const { products } = useCatalog();
  const boxes = products.filter((p) => p.department === GIFTS && p.bundle).sort((a, b) => a.salesRank - b.salesRank).slice(0, 4);
  return (
    <div className="absolute inset-x-0 top-full hidden border-b border-line bg-ivory shadow-lg lg:block">
      <div className="mx-auto grid max-w-7xl grid-cols-[220px_1fr] gap-10 px-8 py-8">
        <div>
          <p className="eyebrow mb-3">Tohfa-e-Khaas</p>
          <p className="font-display text-2xl leading-tight">Curated gift boxes, ready to give</p>
          <Link href="/collections/gifts" className="mt-4 inline-block text-xs uppercase tracking-[0.16em] underline underline-offset-4">All gift boxes →</Link>
        </div>
        {boxes.length ? (
          <ul className="grid grid-cols-4 gap-6">
            {boxes.map((b) => (
              <li key={b.id}>
                <Link href={`/products/${b.slug}`} className="group block">
                  <ProductPhoto product={b} colour={b.colours[0]?.name} sizes="220px" className="aspect-[4/5] w-full" />
                  <p className="mt-2 text-sm group-hover:underline">{b.name}</p>
                  <p className="text-xs text-muted">{b.bundleContents?.length ?? 0} items · {formatPKR(b.price)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="self-center text-sm text-muted">New gift boxes are coming soon.</p>
        )}
      </div>
    </div>
  );
}
