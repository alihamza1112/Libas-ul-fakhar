"use server";

import { customerCanCancel } from "@/lib/orderStatus";
import { rateLimit } from "@/lib/server/rateLimit";
import { trackOrder, updateOrderStatus } from "@/lib/server/store";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/catalog";
import type { Order } from "@/lib/types";

export interface TrackState {
  order?: Order;
  error?: string;
  number?: string;
  phone?: string;
  message?: string;
}

async function limited(): Promise<boolean> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  return !rateLimit(`track:${ip}`, 20, 60_000);
}

export async function track(_: TrackState, fd: FormData): Promise<TrackState> {
  const number = String(fd.get("number") ?? "").trim().toUpperCase();
  const phone = String(fd.get("phone") ?? "").trim();
  if (await limited()) return { error: "Too many attempts. Please wait a minute.", number, phone };
  if (!number || !phone) return { error: "Enter your order number and mobile number.", number, phone };
  const order = await trackOrder(number, phone);
  if (!order) return { error: "We couldn't find an order with those details. Check the number on your confirmation SMS.", number, phone };
  return { order, number, phone };
}

export async function cancel(_: TrackState, fd: FormData): Promise<TrackState> {
  const number = String(fd.get("number") ?? "");
  const phone = String(fd.get("phone") ?? "");
  if (await limited()) return { error: "Too many attempts. Please wait a minute.", number, phone };
  const order = await trackOrder(number, phone);
  if (!order) return { error: "Order not found.", number, phone };
  if (!customerCanCancel(order.status)) return { order, number, phone, error: "This order has already shipped and can no longer be cancelled. You can request a return after delivery." };
  const updated = await updateOrderStatus(order.number, "cancelled", "customer", "Cancelled by customer");
  updateTag(CATALOG_TAG); // restocked
  return { order: updated, number, phone, message: "Your order has been cancelled." };
}
