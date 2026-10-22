import { getCustomer } from "@/lib/server/customers";

// Signed-in state for client components (header, wishlist sync, checkout prefill).
// The shop layout is cached and shared, so per-user data is fetched here instead.
export async function GET() {
  const c = await getCustomer();
  const headers = { "cache-control": "private, no-store" };
  if (!c) return Response.json({ signedIn: false }, { headers });
  return Response.json(
    {
      signedIn: true,
      name: c.name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      wishlist: c.wishlist,
      addresses: c.addresses,
    },
    { headers },
  );
}
