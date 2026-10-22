"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { safeNext } from "@/lib/auth";
import { customerCanCancel } from "@/lib/orderStatus";
import { CATALOG_TAG } from "@/lib/server/catalog";
import {
  deleteAddress,
  endSession,
  getCustomer,
  orderFor,
  requestOtp,
  requireCustomer,
  saveAddress,
  setDefaultAddress,
  startSession,
  updateProfile,
  verifyOtp,
} from "@/lib/server/customers";
import { rateLimit } from "@/lib/server/rateLimit";
import { updateOrderStatus } from "@/lib/server/store";

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

// ---------------------------------------------------------------- sign in

export interface OtpState {
  step: "phone" | "code";
  phone?: string;
  devCode?: string;
  error?: string;
  sentAt?: number;
  done?: boolean;
}

export async function sendCodeAction(prev: OtpState, fd: FormData): Promise<OtpState> {
  const phone = String(fd.get("phone") ?? "");
  if (!rateLimit(`otp-ip:${await ip()}`, 10, 10 * 60_000)) return { ...prev, error: "Too many requests from this device. Try again in a few minutes." };
  const r = await requestOtp(phone);
  if (!r.ok) return { ...prev, step: prev.step, phone: prev.phone ?? phone, error: r.message };
  return { step: "code", phone: r.phone, devCode: r.devCode, sentAt: Date.now() };
}

/** mode "login" signs in; mode "link" adds a verified number to the signed-in account. */
export async function verifyCodeAction(prev: OtpState, fd: FormData): Promise<OtpState> {
  if (!rateLimit(`otp-verify:${await ip()}`, 30, 10 * 60_000)) return { ...prev, error: "Too many attempts. Try again in a few minutes." };
  const mode = fd.get("mode") === "link" ? "link" : "login";
  const me = mode === "link" ? await getCustomer() : undefined;
  if (mode === "link" && !me) return { ...prev, error: "Please sign in again." };
  const r = await verifyOtp(String(fd.get("phone") ?? prev.phone ?? ""), String(fd.get("code") ?? ""), me?.id);
  if (!r.ok) return { ...prev, error: r.message };
  if (mode === "link") {
    revalidatePath("/account", "layout");
    return { step: "phone", done: true };
  }
  await startSession(r.customer.id);
  const dest = safeNext(String(fd.get("next") ?? ""));
  redirect(r.created && dest === "/account" ? "/account?welcome=1" : dest);
}

/** The client reloads the page afterwards (see SignOutButton). */
export async function signOutAction() {
  await endSession();
}

// ---------------------------------------------------------------- profile

export interface FormState {
  ok?: boolean;
  error?: string;
  field?: string;
}

export async function profileAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireCustomer("/account/profile");
  const r = await updateProfile(me.id, { name: String(fd.get("name") ?? ""), email: String(fd.get("email") ?? ""), marketingOptIn: fd.get("marketing") === "on" });
  if (!r.ok) return { error: r.message, field: r.field };
  revalidatePath("/account", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- addresses

export async function addressAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireCustomer("/account/addresses");
  const r = await saveAddress(me.id, {
    id: String(fd.get("id") ?? "") || undefined,
    label: String(fd.get("label") ?? ""),
    name: String(fd.get("name") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    city: String(fd.get("city") ?? ""),
    address: String(fd.get("address") ?? ""),
    area: String(fd.get("area") ?? ""),
    isDefault: fd.get("isDefault") === "on",
  });
  if (!r.ok) return { error: r.message, field: r.field };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(fd: FormData) {
  const me = await requireCustomer("/account/addresses");
  await deleteAddress(me.id, String(fd.get("id")));
  revalidatePath("/account/addresses");
}

export async function defaultAddressAction(fd: FormData) {
  const me = await requireCustomer("/account/addresses");
  await setDefaultAddress(me.id, String(fd.get("id")));
  revalidatePath("/account/addresses");
}

// ---------------------------------------------------------------- orders

export async function cancelOrderAction(_: FormState, fd: FormData): Promise<FormState> {
  const number = String(fd.get("number") ?? "");
  const me = await requireCustomer(`/account/orders/${number}`);
  const order = await orderFor(me, number);
  if (!order) return { error: "Order not found." };
  if (!customerCanCancel(order.status)) return { error: "This order has already shipped and can no longer be cancelled." };
  await updateOrderStatus(order.number, "cancelled", "customer", "Cancelled from account");
  updateTag(CATALOG_TAG); // restocked
  revalidatePath(`/account/orders/${number}`);
  return { ok: true };
}
