"use client";

import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/lib/types";

// The live catalogue (as served by the cached server read) for client components:
// bag, search suggestions, mega menu, wishlist. Keeps prices in the bag in step
// with admin edits instead of a copy bundled into the JavaScript.

interface CatalogState {
  products: Product[];
  byId: (id: string) => Product | undefined;
}

const Ctx = createContext<CatalogState | null>(null);

export function CatalogProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  const value = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return { products, byId: (id: string) => map.get(id) };
  }, [products]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCatalog must be used inside CatalogProvider");
  return v;
}
