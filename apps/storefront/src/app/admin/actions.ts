"use server";

import { revalidatePath, updateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/server/catalog";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/server/adminAuth";
import { rateLimit } from "@/lib/server/rateLimit";
import { OrderError, setStock, updateOrderStatus } from "@/lib/server/store";
import { TRANSITIONS } from "@/lib/orderStatus";
import type { OrderStatus } from "@/lib/types";

export async function login(_: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (!rateLimit(`admin-login:${ip}`, 5, 5 * 60_000)) return { error: "Too many attempts. Try again in a few minutes." };
  if (!process.env.ADMIN_PASSWORD) return { error: "ADMIN_PASSWORD is not set on the server. See README." };
  if (!checkPassword(String(fd.get("password") ?? ""))) return { error: "Incorrect password." };
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

export async function changeStatus(_: { error?: string }, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const number = String(fd.get("number"));
  const to = String(fd.get("to")) as OrderStatus;
  if (!(to in TRANSITIONS)) return { error: "Unknown status." };
  try {
    await updateOrderStatus(number, to, "admin", String(fd.get("note") ?? "") || undefined);
  } catch (e) {
    return { error: e instanceof OrderError ? e.message : "Update failed." };
  }
  updateTag(CATALOG_TAG); // cancel/return restocks
  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function adjustStock(fd: FormData) {
  await requireAdmin();
  const sku = String(fd.get("sku"));
  const qty = Number(fd.get("qty"));
  if (!sku || !Number.isFinite(qty) || qty < 0 || qty > 100000) return;
  await setStock(sku, qty, "admin");
  updateTag(CATALOG_TAG);
  revalidatePath("/admin/inventory");
}
