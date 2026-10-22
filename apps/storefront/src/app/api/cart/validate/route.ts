import { liveLines } from "@/lib/server/store";
import type { CartLine } from "@/lib/types";

// Re-validates price and stock for the bag before checkout (FR-CART-06).
export async function POST(req: Request) {
  const { lines } = (await req.json().catch(() => ({}))) as { lines?: CartLine[] };
  if (!Array.isArray(lines)) return Response.json({ error: "Invalid request." }, { status: 400 });
  return Response.json({ lines: await liveLines(lines) });
}
