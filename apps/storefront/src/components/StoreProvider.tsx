"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import type { CartLine, Product, SavedAddress, Variant } from "@/lib/types";

// Cart, wishlist and recently-viewed live in localStorage (FR-CART-03). When signed
// in, the wishlist is merged into the account and then kept in step with it, so it
// follows the customer across devices.

export interface AccountInfo {
  name: string;
  phone: string;
  email: string;
  addresses: SavedAddress[];
}

export interface ResolvedLine extends CartLine {
  product: Product;
  variant: Variant;
}

interface StoreState {
  ready: boolean;
  lines: ResolvedLine[];
  count: number;
  add: (productId: string, sku: string, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  coupon: string;
  setCoupon: (c: string) => void;
  wishlist: string[];
  toggleWish: (productId: string) => void;
  recent: string[];
  pushRecent: (productId: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (o: boolean) => void;
  toast: string | null;
  showToast: (m: string) => void;
  /** undefined while loading, null when signed out. */
  account: AccountInfo | null | undefined;
  /** Resolves true when this call merged the device wishlist into the account. */
  refreshAccount: () => Promise<boolean>;
}

const Ctx = createContext<StoreState | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode) – state stays in memory */
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { byId } = useCatalog();
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [coupon, setCouponState] = useState("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountInfo | null | undefined>(undefined);
  // True once this device's wishlist has been merged into the signed-in account
  const synced = useRef(false);

  useEffect(() => {
    // Hydrate from storage after mount so server and client markup match.
    /* eslint-disable react-hooks/set-state-in-effect */
    setCart(read("luf.cart", []));
    setCouponState(read("luf.coupon", ""));
    setWishlist(read("luf.wishlist", []));
    setRecent(read("luf.recent", []));
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => { if (ready) write("luf.cart", cart); }, [cart, ready]);
  useEffect(() => { if (ready) write("luf.coupon", coupon); }, [coupon, ready]);
  useEffect(() => { if (ready) write("luf.wishlist", wishlist); }, [wishlist, ready]);
  useEffect(() => { if (ready) write("luf.recent", recent); }, [recent, ready]);

  const refreshAccount = useCallback(async () => {
    try {
      const r = await fetch("/api/account/me", { cache: "no-store" });
      const me = await r.json();
      if (!me.signedIn) {
        // Signed out (or session expired): don't leave the last person's wishlist on a shared device
        if (read("luf.wishlistOwner", false)) {
          setWishlist([]);
          write("luf.wishlistOwner", false);
        }
        synced.current = false;
        setAccount(null);
        return false;
      }
      setAccount({ name: me.name, phone: me.phone, email: me.email, addresses: me.addresses });
      if (!synced.current) {
        const merged = await fetch("/api/account/wishlist", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: read<string[]>("luf.wishlist", []), mode: "merge" }),
        }).then((x) => x.json());
        if (Array.isArray(merged.wishlist)) setWishlist(merged.wishlist);
        write("luf.wishlistOwner", true);
        synced.current = true;
        return true;
      }
      return false;
    } catch {
      setAccount(null); // offline: behave as a guest
      return false;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads account state once storage is read
    if (ready) refreshAccount();
  }, [ready, refreshAccount]);

  // Keep the account's wishlist in step with hearts tapped on this device
  useEffect(() => {
    if (!ready || !account || !synced.current) return;
    const t = window.setTimeout(() => {
      fetch("/api/account/wishlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: wishlist, mode: "replace" }) }).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
  }, [wishlist, account, ready]);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);

  const add = useCallback((productId: string, sku: string, qty = 1) => {
    setCart((c) => {
      const i = c.findIndex((l) => l.sku === sku);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: Math.min(10, l.qty + qty) } : l));
      return [...c, { productId, sku, qty }];
    });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setCart((c) => (qty <= 0 ? c.filter((l) => l.sku !== sku) : c.map((l) => (l.sku === sku ? { ...l, qty: Math.min(10, qty) } : l))));
  }, []);

  const remove = useCallback((sku: string) => setCart((c) => c.filter((l) => l.sku !== sku)), []);
  const clear = useCallback(() => { setCart([]); setCouponState(""); }, []);

  const toggleWish = useCallback(
    (id: string) => {
      const has = wishlist.includes(id);
      showToast(has ? "Removed from wishlist" : "Saved to wishlist");
      setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [id, ...w]));
    },
    [wishlist, showToast],
  );

  const pushRecent = useCallback((id: string) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 12)), []);

  const lines = useMemo(
    () =>
      cart.flatMap((l) => {
        const product = byId(l.productId);
        const variant = product?.variants.find((v) => v.sku === l.sku);
        return product && variant ? [{ ...l, product, variant }] : [];
      }),
    [cart, byId],
  );

  const value: StoreState = {
    ready,
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    add,
    setQty,
    remove,
    clear,
    coupon,
    setCoupon: setCouponState,
    wishlist,
    toggleWish,
    recent,
    pushRecent,
    drawerOpen,
    setDrawerOpen,
    toast,
    showToast,
    account,
    refreshAccount,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
