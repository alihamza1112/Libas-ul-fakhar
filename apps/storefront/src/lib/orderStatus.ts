import type { OrderStatus } from "./types";

// Explicit order state machine (BRD 4.12). Illegal transitions are rejected.
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "failed_delivery"],
  out_for_delivery: ["delivered", "failed_delivery"],
  failed_delivery: ["out_for_delivery", "returned"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed_delivery: "Failed delivery",
  return_requested: "Return requested",
  returned: "Returned",
  refunded: "Refunded",
};

export const HAPPY_PATH: OrderStatus[] = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Statuses after which stock is returned to inventory. */
export function restocks(to: OrderStatus): boolean {
  return to === "cancelled" || to === "returned";
}

/** Customers may cancel only before shipment. */
export function customerCanCancel(s: OrderStatus): boolean {
  return s === "pending" || s === "confirmed";
}
