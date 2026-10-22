import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  canSendOtp,
  checkOtp,
  mergeWishlists,
  OTP_LENGTH,
  OTP_MESSAGE,
  OTP_TTL_MS,
  OTP_WINDOW_MS,
  SESSION_TTL_MS,
  validateAddress,
} from "../auth";
import { normalisePhone } from "../cities";
import type { Address, Customer, Order, SavedAddress } from "../types";
import { audit, load, save, withLock, type DB } from "./db";

// Customer accounts (FR-ACC-01…08): mobile OTP or Google sign-in, sessions,
// address book, wishlist, order history, data export and deletion.

const SESSION_COOKIE = "luf_session";
const MAX_ADDRESSES = 10;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is not configured (min 16 characters). See .env.example.");
  return s;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const otpHash = (phone: string, code: string) => createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function prune(db: DB, now: number) {
  db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > now);
  db.otps = db.otps.filter((o) => Date.parse(o.expiresAt) > now || o.sentAt.some((t) => now - Date.parse(t) < OTP_WINDOW_MS));
}

// ---------------------------------------------------------------- OTP

/** SMS/WhatsApp provider hook. Logs until a provider (FR-WA-01) is configured. */
async function deliverOtp(phone: string, code: string) {
  console.info(`[otp] ${phone}: ${code} (configure an SMS/WhatsApp provider to send this)`);
}

export type OtpRequestResult = { ok: true; phone: string; devCode?: string } | { ok: false; message: string };

export function requestOtp(rawPhone: string): Promise<OtpRequestResult> {
  return withLock(async () => {
    const phone = normalisePhone(rawPhone);
    if (!phone) return { ok: false, message: "Enter a valid Pakistani mobile number (03xx xxxxxxx)." };
    const db = await load();
    const now = Date.now();
    prune(db, now);
    const prev = db.otps.find((o) => o.phone === phone);
    const check = canSendOtp(prev?.sentAt ?? [], now);
    if (!check.ok) return { ok: false, message: check.message };

    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
    const rec = {
      phone,
      hash: otpHash(phone, code),
      expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
      attempts: 0,
      sentAt: [...(prev?.sentAt ?? []), new Date(now).toISOString()].slice(-5),
    };
    db.otps = [...db.otps.filter((o) => o.phone !== phone), rec];
    await save(db);
    await deliverOtp(phone, code);
    // Without an SMS provider, development builds show the code on screen so the flow can be tested.
    return { ok: true, phone, ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}) };
  });
}

export type OtpVerifyResult = { ok: true; customer: Customer; created: boolean } | { ok: false; message: string };

/**
 * Checks a code. On success either signs in (finding or creating the customer for
 * that number) or, with `linkTo`, adds the verified number to a signed-in account.
 */
export function verifyOtp(rawPhone: string, code: string, linkTo?: string): Promise<OtpVerifyResult> {
  return withLock(async () => {
    const phone = normalisePhone(rawPhone);
    if (!phone) return { ok: false, message: "Enter a valid Pakistani mobile number." };
    const db = await load();
    const now = Date.now();
    const rec = db.otps.find((o) => o.phone === phone);
    const clean = code.replace(/\D/g, "");
    const matches = !!rec && clean.length === OTP_LENGTH && sameHash(rec.hash, otpHash(phone, clean));
    const { outcome, attemptsLeft } = checkOtp(rec, matches, now);
    if (outcome !== "ok") {
      if (rec && (outcome === "wrong" || outcome === "locked")) rec.attempts++;
      await save(db);
      return { ok: false, message: outcome === "wrong" ? `${OTP_MESSAGE.wrong} ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.` : OTP_MESSAGE[outcome] };
    }
    // Single use: a verified code can't be replayed
    db.otps = db.otps.filter((o) => o.phone !== phone);

    const at = new Date(now).toISOString();
    if (linkTo) {
      const me = db.customers.find((c) => c.id === linkTo);
      if (!me) return { ok: false, message: "Please sign in again." };
      const owner = db.customers.find((c) => c.phone === phone && c.id !== me.id);
      if (owner) {
        await save(db);
        return { ok: false, message: "This number already has its own account. Sign out and sign in with it instead." };
      }
      me.phone = phone;
      me.updatedAt = at;
      audit(db, me.id, "customer.phone_verified", me.id);
      await save(db);
      return { ok: true, customer: me, created: false };
    }

    let customer = db.customers.find((c) => c.phone === phone);
    const created = !customer;
    if (!customer) {
      customer = { id: `c_${randomBytes(6).toString("hex")}`, phone, createdAt: at, addresses: [], wishlist: [] };
      db.customers.push(customer);
      audit(db, customer.id, "customer.create", customer.id, "via mobile OTP");
    }
    customer.lastLoginAt = at;
    await save(db);
    return { ok: true, customer, created };
  });
}

// ---------------------------------------------------------------- Google

export function upsertGoogleCustomer(p: { sub: string; email?: string; emailVerified: boolean; name?: string }): Promise<Customer> {
  return withLock(async () => {
    const db = await load();
    const at = new Date().toISOString();
    let c = db.customers.find((x) => x.googleSub === p.sub);
    if (!c && p.email && p.emailVerified) {
      // Link to an existing account only if that email was itself verified by Google before
      c = db.customers.find((x) => x.googleSub && x.email === p.email);
    }
    if (!c) {
      c = { id: `c_${randomBytes(6).toString("hex")}`, googleSub: p.sub, createdAt: at, addresses: [], wishlist: [] };
      db.customers.push(c);
      audit(db, c.id, "customer.create", c.id, "via Google");
    }
    c.googleSub = p.sub;
    if (p.email && p.emailVerified) c.email = p.email.toLowerCase();
    if (!c.name && p.name) c.name = p.name.slice(0, 80);
    c.lastLoginAt = at;
    await save(db);
    return c;
  });
}

// ---------------------------------------------------------------- sessions

export function startSession(customerId: string): Promise<void> {
  return withLock(async () => {
    const db = await load();
    const now = Date.now();
    prune(db, now);
    const token = randomBytes(32).toString("base64url");
    db.sessions.push({ hash: sha256(token), customerId, createdAt: new Date(now).toISOString(), expiresAt: new Date(now + SESSION_TTL_MS).toISOString() });
    await save(db);
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });
  });
}

export async function getCustomer(): Promise<Customer | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  const db = await load();
  const s = db.sessions.find((x) => x.hash === sha256(token));
  if (!s || Date.parse(s.expiresAt) <= Date.now()) return undefined;
  return db.customers.find((c) => c.id === s.customerId);
}

export async function requireCustomer(next = "/account"): Promise<Customer> {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return c;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (!token) return;
  await withLock(async () => {
    const db = await load();
    db.sessions = db.sessions.filter((s) => s.hash !== sha256(token));
    await save(db);
  });
}

// ---------------------------------------------------------------- profile, addresses, wishlist

function mutate<T>(customerId: string, fn: (c: Customer, db: DB) => T): Promise<T> {
  return withLock(async () => {
    const db = await load();
    const c = db.customers.find((x) => x.id === customerId);
    if (!c) throw new Error("Customer not found");
    const out = fn(c, db);
    c.updatedAt = new Date().toISOString();
    await save(db);
    return out;
  });
}

export type FieldResult = { ok: true } | { ok: false; field?: string; message: string };

export function updateProfile(customerId: string, p: { name: string; email: string; marketingOptIn: boolean }): Promise<FieldResult> {
  const name = p.name.trim();
  const email = p.email.trim().toLowerCase();
  if (name && (name.length < 2 || name.length > 80)) return Promise.resolve({ ok: false, field: "name", message: "Name must be 2–80 characters." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Promise.resolve({ ok: false, field: "email", message: "Enter a valid email address." });
  return mutate(customerId, (c) => {
    // A Google-verified email can't be swapped for an unverified one
    if (!(c.googleSub && c.email && email !== c.email)) c.email = email || undefined;
    c.name = name || undefined;
    if (c.marketingOptIn !== p.marketingOptIn) c.marketingOptIn = p.marketingOptIn; // consent change (FR-ACC-08)
    return { ok: true as const };
  });
}

export function saveAddress(customerId: string, input: Partial<SavedAddress>): Promise<FieldResult & { id?: string }> {
  const v = validateAddress(input);
  if (!v.ok) return Promise.resolve({ ok: false, field: v.field, message: v.message });
  const label = (input.label ?? "").trim().slice(0, 30) || undefined;
  return mutate(customerId, (c) => {
    const existing = input.id ? c.addresses.find((a) => a.id === input.id) : undefined;
    if (!existing && c.addresses.length >= MAX_ADDRESSES) return { ok: false as const, message: `You can save up to ${MAX_ADDRESSES} addresses.` };
    // Don't store an exact duplicate of an address already saved
    const dup = c.addresses.find((a) => a.id !== existing?.id && a.address === v.address.address && a.city === v.address.city && a.phone === v.address.phone && a.name === v.address.name);
    if (dup && !existing) return { ok: true as const, id: dup.id };
    const id = existing?.id ?? `a_${randomBytes(4).toString("hex")}`;
    const saved: SavedAddress = { ...v.address, id, ...(label ? { label } : {}), isDefault: input.isDefault || c.addresses.length === 0 || existing?.isDefault };
    c.addresses = existing ? c.addresses.map((a) => (a.id === id ? saved : a)) : [...c.addresses, saved];
    if (saved.isDefault) c.addresses = c.addresses.map((a) => ({ ...a, isDefault: a.id === id }));
    return { ok: true as const, id };
  });
}

export function deleteAddress(customerId: string, id: string): Promise<void> {
  return mutate(customerId, (c) => {
    const wasDefault = c.addresses.find((a) => a.id === id)?.isDefault;
    c.addresses = c.addresses.filter((a) => a.id !== id);
    if (wasDefault && c.addresses[0]) c.addresses[0].isDefault = true;
  });
}

export function setDefaultAddress(customerId: string, id: string): Promise<void> {
  return mutate(customerId, (c) => {
    if (c.addresses.some((a) => a.id === id)) c.addresses = c.addresses.map((a) => ({ ...a, isDefault: a.id === id }));
  });
}

/** Merges this device's wishlist into the account and returns the result. */
export function syncWishlist(customerId: string, local: string[], replace: boolean): Promise<string[]> {
  return mutate(customerId, (c, db) => {
    const known = new Set(db.products.map((p) => p.id));
    c.wishlist = (replace ? mergeWishlists([], local) : mergeWishlists(c.wishlist, local)).filter((id) => known.has(id));
    return c.wishlist;
  });
}

// ---------------------------------------------------------------- orders

/** Orders placed while signed in, plus guest orders made with the verified mobile number. */
export async function ordersFor(c: Customer): Promise<Order[]> {
  const db = await load();
  return db.orders.filter((o) => o.customerId === c.id || (!!c.phone && !o.customerId && o.address.phone === c.phone));
}

export async function orderFor(c: Customer, number: string): Promise<Order | undefined> {
  return (await ordersFor(c)).find((o) => o.number === number);
}

/** Saves the address used at checkout to the account (opt-in box at checkout). */
export async function rememberCheckoutAddress(customerId: string, address: Address): Promise<void> {
  await saveAddress(customerId, address).catch(() => undefined);
}

// ---------------------------------------------------------------- privacy (FR-ACC-08)

export async function exportData(c: Customer) {
  return {
    exportedAt: new Date().toISOString(),
    account: { id: c.id, name: c.name, phone: c.phone, email: c.email, signInWithGoogle: !!c.googleSub, createdAt: c.createdAt, marketingOptIn: !!c.marketingOptIn },
    addresses: c.addresses,
    wishlist: c.wishlist,
    orders: (await ordersFor(c)).map((o) => ({ number: o.number, createdAt: o.createdAt, status: o.status, items: o.items.map(({ name, colour, size, qty, unitPrice }) => ({ name, colour, size, qty, unitPrice })), totals: o.totals, address: o.address })),
  };
}

/**
 * Deletes the account, its sessions, addresses and wishlist. Orders are kept for
 * fulfilment, returns and tax records, but are no longer linked to the account.
 */
export function deleteAccount(customerId: string): Promise<void> {
  return withLock(async () => {
    const db = await load();
    db.customers = db.customers.filter((c) => c.id !== customerId);
    db.sessions = db.sessions.filter((s) => s.customerId !== customerId);
    for (const o of db.orders) if (o.customerId === customerId) delete o.customerId;
    audit(db, customerId, "customer.delete", customerId, "account deleted by customer");
    await save(db);
  });
}
