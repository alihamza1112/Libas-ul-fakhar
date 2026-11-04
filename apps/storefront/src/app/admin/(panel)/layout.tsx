import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/server/adminAuth";
import { AdminNav } from "./AdminNav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin min-h-screen lg:flex">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<div className="card h-64 animate-pulse" aria-busy="true" aria-label="Loading" />}>
            <Guard>{children}</Guard>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
