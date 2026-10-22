import { getCustomer, syncWishlist } from "@/lib/server/customers";

/**
 * PUT { ids, mode: "merge" | "replace" }.
 * "merge" on sign-in folds this device's list into the account (FR-CART-03 style);
 * "replace" afterwards keeps the account in step with each heart tap.
 */
export async function PUT(req: Request) {
  const c = await getCustomer();
  if (!c) return Response.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown; mode?: string };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 300) : [];
  const wishlist = await syncWishlist(c.id, ids, body.mode === "replace");
  return Response.json({ wishlist }, { headers: { "cache-control": "private, no-store" } });
}
