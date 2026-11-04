"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { Sheet } from "@/components/Sheet";
import { CloseIcon, MenuIcon } from "@/components/Icons";
import { logout } from "../actions";

// Same outline style as components/Icons.tsx, sized for the sidebar
function I({ d }: { d: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
const icons = {
  dashboard: <I d={<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>} />,
  orders: <I d={<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>} />,
  products: <I d={<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></>} />,
  inventory: <I d={<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>} />,
  import: <I d={<><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>} />,
  store: <I d={<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>} />,
  logout: <I d={<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>} />,
};

type Item = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: icons.dashboard, match: (p) => p === "/admin" }] },
  { label: "Sales", items: [{ href: "/admin/orders", label: "Orders", icon: icons.orders, match: (p) => p.startsWith("/admin/orders") }] },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: icons.products, match: (p) => p.startsWith("/admin/products") && !p.startsWith("/admin/products/import") },
      { href: "/admin/inventory", label: "Inventory", icon: icons.inventory, match: (p) => p.startsWith("/admin/inventory") },
      { href: "/admin/products/import", label: "Import CSV", icon: icons.import, match: (p) => p.startsWith("/admin/products/import") },
    ],
  },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Back office" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted/80">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.match(pathname);
              return (
                <li key={it.href}>
                  <Link href={it.href} onClick={onNavigate} className={`nav-item ${active ? "nav-item-active" : ""}`} aria-current={active ? "page" : undefined}>
                    {it.icon}
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Reads the URL in its own boundary so the shell can prerender without it. */
function ActiveNavList(props: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} {...props} />;
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--admin-line)] px-6">
        <Link href="/admin" onClick={onNavigate} aria-label="Dashboard">
          <Image src="/brand/logo-latin.png" alt="Libas-ul-Fakhar" width={936} height={127} className="h-[18px] w-auto" loading="eager" />
        </Link>
      </div>
      <Suspense fallback={<NavList pathname="" />}>
        <ActiveNavList onNavigate={onNavigate} />
      </Suspense>
      <div className="space-y-0.5 border-t border-[var(--admin-line)] px-3 py-3">
        <a href="/" target="_blank" rel="noopener" className="nav-item">
          {icons.store}
          View store
        </a>
        <form action={logout}>
          <button className="nav-item w-full">
            {icons.logout}
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}

export function AdminNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-e border-[var(--admin-line)] bg-white lg:flex">
        <SidebarBody />
      </aside>

      {/* Mobile and tablet: top bar with a sliding drawer */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--admin-line)] bg-white/90 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="-ms-2 rounded-md p-2 transition-colors hover:bg-[var(--admin-hover)]">
          <MenuIcon width={20} height={20} />
        </button>
        <Image src="/brand/logo-latin.png" alt="Libas-ul-Fakhar" width={936} height={127} className="h-4 w-auto" loading="eager" />
        <span className="ms-auto rounded-full bg-[var(--admin-hover)] px-2.5 py-1 text-[11px] font-medium text-muted">Back office</span>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} label="Navigation" side="start" className="w-[280px] max-w-[85%] bg-white">
        <button onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute end-3 top-4 z-10 rounded-md p-1.5 text-muted transition hover:rotate-90 hover:text-ink">
          <CloseIcon width={18} height={18} />
        </button>
        <SidebarBody onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
