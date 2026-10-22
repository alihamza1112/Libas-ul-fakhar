import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// Minimal single-role admin session for the MVP slice. Full RBAC, 2FA and
// per-module permissions (FR-ADM-01) replace this in the admin milestone.

const COOKIE = "luf_admin";
const TTL_MS = 8 * 60 * 60 * 1000; // session timeout

function secret(): string {
  const s = process.env.ADMIN_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not configured");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function checkPassword(pw: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(sign(pw));
  const b = Buffer.from(sign(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession() {
  const exp = String(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  await connection(); // session expiry depends on the current time
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
