import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { createOrder, OrderError } from "@/lib/server/store";
import { getCustomer, rememberCheckoutAddress } from "@/lib/server/customers";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`order:${ip}`, 5, 60_000)) {
    return Response.json({ error: "Too many orders from this device. Please wait a minute and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    // The account comes from the session cookie, never from the request body
    const customer = await getCustomer();
    const input = body as Parameters<typeof createOrder>[0] & { saveAddress?: boolean };
    const { order, duplicate } = await createOrder({ ...input, customerId: customer?.id });
    if (customer && !duplicate && input.saveAddress) await rememberCheckoutAddress(customer.id, order.address);
    if (!duplicate) revalidateTag(CATALOG_TAG, "max"); // stock changed
    // Remember this browser's recent orders so the confirmation page can show
    // details without putting personal data in the URL.
    const jar = await cookies();
    const recent = (jar.get("luf_orders")?.value ?? "").split(".").filter(Boolean);
    jar.set("luf_orders", [order.number, ...recent.filter((n) => n !== order.number)].slice(0, 10).join("."), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return Response.json({ number: order.number, duplicate }, { status: duplicate ? 200 : 201 });
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ error: e.message, field: e.field }, { status: 422 });
    console.error("[orders] create failed", e);
    return Response.json({ error: "We couldn't place your order. Please try again." }, { status: 500 });
  }
}
