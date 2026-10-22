"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductGrid } from "@/components/ProductRows";
import { useStore } from "@/components/StoreProvider";
import { useCatalog } from "@/components/CatalogProvider";

export default function WishlistPage() {
  const { wishlist, ready } = useStore();
  const { byId } = useCatalog();
  const items = wishlist.map(byId).filter(Boolean) as Product[];
  return (
    <div className="mx-auto max-w-7xl px-4">
      <Breadcrumbs items={[["Wishlist"]]} />
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl">Wishlist</h1>
        <p className="mt-2 text-sm text-muted">Saved on this device. Sign-in with price-drop alerts arrives with accounts.</p>
      </header>
      {!ready ? null : items.length ? (
        <ProductGrid products={items} />
      ) : (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">Nothing saved yet</p>
          <p className="mt-2 text-sm text-muted">Tap the heart on any piece to keep it here.</p>
          <Link href="/collections/all" className="btn btn-primary mt-6">Browse the collection</Link>
        </div>
      )}
    </div>
  );
}
