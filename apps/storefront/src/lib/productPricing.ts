import type { Product, SaleSchedule } from "./types";

// Sale scheduling (FR-PRM-01, FR-ADM-13): a product has a regular basePrice and an
// optional sale with start/end. The selling price is derived at read time, so a
// sale goes live and reverts on its own without anyone touching the product.

export type SaleState = "none" | "scheduled" | "live" | "ended";

export const NEW_ARRIVAL_DAYS = 30;

export function saleState(sale: SaleSchedule | undefined, now: number): SaleState {
  if (!sale) return "none";
  if (sale.startsAt && now < Date.parse(sale.startsAt)) return "scheduled";
  if (sale.endsAt && now >= Date.parse(sale.endsAt)) return "ended";
  return "live";
}

/** Fills in the derived fields (price, compareAt, isNew) for the given moment. */
export function materialize(p: Product, now: number): Product {
  const live = saleState(p.sale, now) === "live" && p.sale!.price < p.basePrice;
  return {
    ...p,
    price: live ? p.sale!.price : p.basePrice,
    compareAt: live ? p.basePrice : undefined,
    isNew: now - Date.parse(p.createdAt) < NEW_ARRIVAL_DAYS * 86400000,
  };
}

/** Sale price for a percentage off, ending in 90 like the rest of the catalogue (Rs. 2,790). */
export function salePriceForPercent(basePrice: number, percent: number): number {
  const raw = (basePrice * (100 - percent)) / 100;
  const rounded = Math.round(raw / 100_00) * 100_00 - 10_00;
  return rounded > 0 && rounded < basePrice ? rounded : Math.max(100, Math.round(raw / 100) * 100);
}

// Pakistan Standard Time is UTC+5 all year (no DST), so conversion is a fixed offset.
const PKT_OFFSET_MS = 5 * 3600 * 1000;

/** "2026-11-01T10:00" (Karachi wall-clock, from <input type="datetime-local">) → ISO UTC. */
export function pktLocalToIso(local: string): string | undefined {
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/);
  if (!m) return undefined;
  const [, y, mo, d, h = "00", mi = "00"] = m;
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi) - PKT_OFFSET_MS;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** ISO UTC → "2026-11-01T10:00" in Karachi time, for datetime-local inputs. */
export function isoToPktLocal(iso: string | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t + PKT_OFFSET_MS).toISOString().slice(0, 16);
}

export function formatPkt(iso: string): string {
  return isoToPktLocal(iso).replace("T", " ") + " PKT";
}
