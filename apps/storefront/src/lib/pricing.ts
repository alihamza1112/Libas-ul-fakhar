import type { Totals } from "./types";

// Pure pricing rules shared by the cart (client) and order creation (server).
// The server always re-computes; client numbers are display-only.

export const FREE_SHIPPING_THRESHOLD = 4999_00;
export const MAJOR_CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi"];
export const SHIPPING_MAJOR = 200_00;
export const SHIPPING_OTHER = 300_00;

export interface Coupon {
  code: string;
  label: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number; // percent (0-100) or paisa
  minSubtotal: number;
  maxDiscount?: number;
}

export const COUPONS: Coupon[] = [
  { code: "WELCOME10", label: "10% off your first order (max Rs. 1,000)", type: "percent", value: 10, minSubtotal: 2000_00, maxDiscount: 1000_00 },
  { code: "FAKHAR500", label: "Rs. 500 off orders over Rs. 5,000", type: "fixed", value: 500_00, minSubtotal: 5000_00 },
  { code: "FREESHIP", label: "Free delivery on any order", type: "free_shipping", value: 0, minSubtotal: 0 },
];

export function formatPKR(paisa: number): string {
  const rupees = Math.round(paisa / 100);
  return `Rs. ${rupees.toLocaleString("en-US")}`;
}

export function shippingFor(city: string | undefined, subtotalAfterDiscount: number): number {
  if (subtotalAfterDiscount <= 0) return 0;
  if (subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD) return 0;
  return city && !MAJOR_CITIES.includes(city) ? SHIPPING_OTHER : SHIPPING_MAJOR;
}

export function findCoupon(code: string | undefined): Coupon | undefined {
  if (!code) return undefined;
  return COUPONS.find((c) => c.code === code.trim().toUpperCase());
}

export function computeTotals(
  lines: { unitPrice: number; qty: number }[],
  opts: { coupon?: string; city?: string } = {},
): Totals {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * Math.max(0, Math.floor(l.qty)), 0);
  let discount = 0;
  let freeShipping = false;
  let couponApplied: string | undefined;
  let couponError: string | undefined;

  if (opts.coupon) {
    const c = findCoupon(opts.coupon);
    if (!c) couponError = "This code is not valid.";
    else if (subtotal < c.minSubtotal) couponError = `Add ${formatPKR(c.minSubtotal - subtotal)} more to use ${c.code}.`;
    else {
      couponApplied = c.code;
      if (c.type === "percent") {
        discount = Math.round((subtotal * c.value) / 100);
        if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
      } else if (c.type === "fixed") {
        discount = Math.min(c.value, subtotal);
      } else {
        freeShipping = true;
      }
    }
  }

  const afterDiscount = subtotal - discount;
  const shipping = freeShipping ? 0 : shippingFor(opts.city, afterDiscount);
  return { subtotal, discount, shipping, total: afterDiscount + shipping, couponApplied, couponError };
}
