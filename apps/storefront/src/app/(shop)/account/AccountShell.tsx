import Link from "next/link";
import type { Customer } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountSync, SignOutButton } from "./AccountClient";

const NAV = [
  { key: "overview", href: "/account", label: "Overview" },
  { key: "orders", href: "/account/orders", label: "Orders" },
  { key: "addresses", href: "/account/addresses", label: "Addresses" },
  { key: "wishlist", href: "/wishlist", label: "Wishlist" },
  { key: "profile", href: "/account/profile", label: "Profile & privacy" },
] as const;

export function displayName(c: Customer): string {
  return c.name?.split(" ")[0] || (c.phone ? `${c.phone.slice(0, 4)} ${c.phone.slice(4)}` : c.email ?? "there");
}

export function AccountShell({ customer, active, title, crumbs, children }: { customer: Customer; active: (typeof NAV)[number]["key"]; title: string; crumbs?: [string, string?][]; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <AccountSync />
      <Breadcrumbs items={crumbs ?? [["My account", active === "overview" ? undefined : "/account"], ...(active === "overview" ? [] : [[title] as [string]])]} />
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <aside>
          <p className="mb-4 text-sm text-muted">Signed in as<br /><span className="text-ink">{customer.name || customer.phone || customer.email}</span></p>
          <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0 md:px-0">
            {NAV.map((n) => (
              <Link key={n.key} href={n.href} aria-current={active === n.key ? "page" : undefined} className={`shrink-0 whitespace-nowrap border px-3 py-2 text-sm md:border-0 md:border-s-2 md:px-3 ${active === n.key ? "border-ink bg-white md:border-ink" : "border-line md:border-transparent hover:md:border-clay"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 hidden md:block">
            <SignOutButton className="text-sm text-muted underline underline-offset-4 hover:text-ink" />
          </div>
        </aside>
        <div className="min-w-0 pb-10">
          <h1 className="mb-6 text-4xl">{title}</h1>
          {children}
          <div className="mt-10 md:hidden">
            <SignOutButton className="btn btn-secondary w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
