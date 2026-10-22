import { normalisePhone } from "@/lib/cities";
import { addStockAlert, skuExists } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`alert:${ip}`, 10, 60_000)) return Response.json({ error: "Please try again in a minute." }, { status: 429 });
  const { sku, contact } = (await req.json().catch(() => ({}))) as { sku?: string; contact?: string };
  if (!sku || !(await skuExists(sku))) return Response.json({ error: "Unknown product." }, { status: 422 });
  const c = (contact ?? "").trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? c.toLowerCase() : null;
  const phone = normalisePhone(c);
  if (!email && !phone) return Response.json({ error: "Enter a valid email or Pakistani mobile number." }, { status: 422 });
  await addStockAlert(sku, (email ?? phone)!);
  return Response.json({ ok: true });
}
