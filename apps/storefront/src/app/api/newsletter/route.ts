import { normalisePhone } from "@/lib/cities";
import { addSubscriber } from "@/lib/server/store";
import { rateLimit } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`nl:${ip}`, 5, 60_000)) return Response.json({ error: "Please try again in a minute." }, { status: 429 });
  const { contact, consent } = (await req.json().catch(() => ({}))) as { contact?: string; consent?: boolean };
  if (!consent) return Response.json({ error: "Please tick the consent box to subscribe." }, { status: 422 });
  const c = (contact ?? "").trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? c.toLowerCase() : null;
  const phone = normalisePhone(c);
  if (!email && !phone) return Response.json({ error: "Enter a valid email or Pakistani mobile number." }, { status: 422 });
  await addSubscriber((email ?? phone)!);
  return Response.json({ ok: true });
}
