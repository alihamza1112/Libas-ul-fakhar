import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/server/adminAuth";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-ink text-ivory">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-3">
          <Link href="/admin"><Image src="/brand/logo-latin-light.png" alt="Libas-ul-Fakhar" width={936} height={127} className="h-4 w-auto" /></Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/admin" className="hover:underline">Dashboard & orders</Link>
            <Link href="/admin/products" className="hover:underline">Products</Link>
            <Link href="/admin/inventory" className="hover:underline">Inventory</Link>
            <Link href="/" className="text-ivory/60 hover:underline" target="_blank">View store ↗</Link>
          </nav>
          <form action={logout} className="ms-auto">
            <button className="text-sm text-ivory/70 hover:text-ivory">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Suspense fallback={<div className="h-64 animate-pulse bg-white" />}>
          <Guard>{children}</Guard>
        </Suspense>
      </main>
    </div>
  );
}
