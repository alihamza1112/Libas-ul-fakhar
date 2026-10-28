import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
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
import { cachedPool, isUniqueViolation, live, tx } from "./db";
import { insertAddress, insertCustomer, selectCustomer, selectOrders, writeAudit } from "./rows";

// Customer accounts (FR-ACC-01…08): mobile OTP or Google sign-in, sessions,
// address book, wishlist, order history, data export and deletion. PostgreSQL-backed.

const SESSION_COOKIE = "luf_session";
const MAX_ADDRESSES = 10;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is not configured (min 16 characters). See .env.example.");
  return s;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const otpHash = (phone: string, code: string) => createHmac("sha256", secret()).update(`${phone}:${code}`).digest("hex");
const newCustomerId = () => `c_${randomBytes(6).toString("hex")}`;

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const byId = (c: PoolClient, id: string) => selectCustomer(c, "WHERE c.id = $1", [id]);

// ---------------------------------------------------------------- OTP

/** SMS/WhatsApp provider hook. Logs until a provider (FR-WA-01) is configured. */
async function deliverOtp(phone: string, code: string) {
  console.info(`[otp] ${phone}: ${code} (configure an SMS/WhatsApp provider to send this)`);
}

export type OtpRequestResult = { ok: true; phone: string; devCode?: string } | { ok: false; message: string };

export async function requestOtp(rawPhone: string): Promise<OtpRequestResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, message: "Enter a valid Pakistani mobile number (03xx xxxxxxx)." };
  const result = await tx(async (c): Promise<OtpRequestResult & { code?: string }> => {
    const now = Date.now();
    // Expired codes whose sends are also outside the rate-limit window are no longer needed
    await c.query("DELETE FROM otps WHERE expires_at < now() - make_interval(secs => $1)", [OTP_WINDOW_MS / 1000]);
    const { rows } = await c.query<{ sent_at: Date[] }>("SELECT sent_at FROM otps WHERE phone = $1", [phone]);
    const sentAt = (rows[0]?.sent_at ?? []).map((d) => new Date(d).toISOString());
    const check = canSendOtp(sentAt, now);
    if (!check.ok) return { ok: false, message: check.message };

    const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
    await c.query(
      `INSERT INTO otps (phone, hash, expires_at, attempts, sent_at) VALUES ($1, $2, $3, 0, $4)
       ON CONFLICT (phone) DO UPDATE SET hash = EXCLUDED.hash, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = EXCLUDED.sent_at`,
      [phone, otpHash(phone, code), new Date(now + OTP_TTL_MS).toISOString(), [...sentAt, new Date(now).toISOString()].slice(-5)],
    );
    return { ok: true, phone, code };
  }, `otp:${phone}`);
  if (!result.ok) return result;
  await deliverOtp(phone, result.code!);
  // Without an SMS provider, development builds show the code on screen so the flow can be tested.
  return { ok: true, phone, ...(process.env.NODE_ENV !== "production" ? { devCode: result.code } : {}) };
}

export type OtpVerifyResult = { ok: true; customer: Customer; created: boolean } | { ok: false; message: string };

/**
 * Checks a code. On success either signs in (finding or creating the customer for
 * that number) or, with `linkTo`, adds the verified number to a signed-in account.
 */
export async function verifyOtp(rawPhone: string, code: string, linkTo?: string): Promise<OtpVerifyResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, message: "Enter a valid Pakistani mobile number." };
  try {
    return await tx(async (c): Promise<OtpVerifyResult> => {
      const now = Date.now();
      const { rows } = await c.query<{ hash: string; expires_at: Date; attempts: number }>("SELECT hash, expires_at, attempts FROM otps WHERE phone = $1", [phone]);
      const rec = rows[0] ? { hash: rows[0].hash, expiresAt: new Date(rows[0].expires_at).toISOString(), attempts: rows[0].attempts } : undefined;
      const clean = code.replace(/\D/g, "");
      const matches = !!rec && clean.length === OTP_LENGTH && sameHash(rec.hash, otpHash(phone, clean));
      const { outcome, attemptsLeft } = checkOtp(rec, matches, now);
      if (outcome !== "ok") {
        if (rec && (outcome === "wrong" || outcome === "locked")) await c.query("UPDATE otps SET attempts = attempts + 1 WHERE phone = $1", [phone]);
        return { ok: false, message: outcome === "wrong" ? `${OTP_MESSAGE.wrong} ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.` : OTP_MESSAGE[outcome] };
      }
      // Single use: a verified code can't be replayed
      await c.query("DELETE FROM otps WHERE phone = $1", [phone]);

      if (linkTo) {
        const me = await byId(c, linkTo);
        if (!me) return { ok: false, message: "Please sign in again." };
        const { rowCount } = await c.query("SELECT 1 FROM customers WHERE phone = $1 AND id <> $2", [phone, me.id]);
        if (rowCount) return { ok: false, message: "This number already has its own account. Sign out and sign in with it instead." };
        await c.query("UPDATE customers SET phone = $2, updated_at = now() WHERE id = $1", [me.id, phone]);
        await writeAudit(c, me.id, "customer.phone_verified", me.id);
        return { ok: true, customer: { ...me, phone }, created: false };
      }

      let customer = await selectCustomer(c, "WHERE c.phone = $1", [phone]);
      const created = !customer;
      if (!customer) {
        customer = { id: newCustomerId(), phone, createdAt: new Date(now).toISOString(), addresses: [], wishlist: [] };
        await insertCustomer(c, customer);
        await writeAudit(c, customer.id, "customer.create", customer.id, "via mobile OTP");
      }
      await c.query("UPDATE customers SET last_login_at = now() WHERE id = $1", [customer.id]);
      return { ok: true, customer, created };
    }, `otp:${phone}`);
  } catch (e) {
    if (isUniqueViolation(e, "customers_phone_key")) return { ok: false, message: "This number was just registered. Please try signing in again." };
    throw e;
  }
}

// ---------------------------------------------------------------- Google

export function upsertGoogleCustomer(p: { sub: string; email?: string; emailVerified: boolean; name?: string }): Promise<Customer> {
  return tx(async (c) => {
    let cust = await selectCustomer(c, "WHERE c.google_sub = $1", [p.sub]);
    if (!cust && p.email && p.emailVerified) {
      // Link to an existing account only if that email was itself verified by Google before
      cust = await selectCustomer(c, "WHERE c.google_sub IS NOT NULL AND c.email = $1", [p.email.toLowerCase()]);
    }
    if (!cust) {
      cust = { id: newCustomerId(), googleSub: p.sub, createdAt: new Date().toISOString(), addresses: [], wishlist: [] };
      await insertCustomer(c, cust);
      await writeAudit(c, cust.id, "customer.create", cust.id, "via Google");
    }
    const email = p.email && p.emailVerified ? p.email.toLowerCase() : cust.email;
    const name = cust.name || p.name?.slice(0, 80);
    await c.query("UPDATE customers SET google_sub = $2, email = $3, name = $4, last_login_at = now() WHERE id = $1", [cust.id, p.sub, email ?? null, name ?? null]);
    return { ...cust, googleSub: p.sub, email, name };
  }, `google:${p.sub}`);
}

// ---------------------------------------------------------------- sessions

export async function startSession(customerId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const db = cachedPool();
  await db.query("DELETE FROM sessions WHERE expires_at < now()");
  await db.query("INSERT INTO sessions (hash, customer_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), customerId, new Date(Date.now() + SESSION_TTL_MS).toISOString()]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function getCustomer(): Promise<Customer | undefined> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  return selectCustomer(await live(), "WHERE c.id = (SELECT customer_id FROM sessions WHERE hash = $1 AND expires_at > now())", [sha256(token)]);
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
  if (token) await cachedPool().query("DELETE FROM sessions WHERE hash = $1", [sha256(token)]);
}

// ---------------------------------------------------------------- profile, addresses, wishlist

export type FieldResult = { ok: true } | { ok: false; field?: string; message: string };

export async function updateProfile(customerId: string, p: { name: string; email: string; marketingOptIn: boolean }): Promise<FieldResult> {
  const name = p.name.trim();
  const email = p.email.trim().toLowerCase();
  if (name && (name.length < 2 || name.length > 80)) return { ok: false, field: "name", message: "Name must be 2–80 characters." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: "email", message: "Enter a valid email address." };
  // A Google-verified email can't be swapped for an unverified one
  await cachedPool().query(
    `UPDATE customers SET
       name = $2,
       email = CASE WHEN google_sub IS NOT NULL AND email IS NOT NULL THEN email ELSE $3 END,
       marketing_opt_in = $4,
       updated_at = now()
     WHERE id = $1`,
    [customerId, name || null, email || null, p.marketingOptIn],
  );
  return { ok: true };
}

export function saveAddress(customerId: string, input: Partial<SavedAddress>): Promise<FieldResult & { id?: string }> {
  const v = validateAddress(input);
  if (!v.ok) return Promise.resolve({ ok: false, field: v.field, message: v.message });
  const label = (input.label ?? "").trim().slice(0, 30) || undefined;
  return tx(async (c) => {
    const me = await byId(c, customerId);
    if (!me) return { ok: false as const, message: "Please sign in again." };
    const existing = input.id ? me.addresses.find((a) => a.id === input.id) : undefined;
    if (!existing && me.addresses.length >= MAX_ADDRESSES) return { ok: false as const, message: `You can save up to ${MAX_ADDRESSES} addresses.` };
    // Don't store an exact duplicate of an address already saved
    const dup = me.addresses.find((a) => a.id !== existing?.id && a.address === v.address.address && a.city === v.address.city && a.phone === v.address.phone && a.name === v.address.name);
    if (dup && !existing) return { ok: true as const, id: dup.id };

    const id = existing?.id ?? `a_${randomBytes(4).toString("hex")}`;
    const isDefault = !!(input.isDefault || me.addresses.length === 0 || existing?.isDefault);
    const saved: SavedAddress = { ...v.address, id, ...(label ? { label } : {}), isDefault };
    if (existing) {
      await c.query(
        "UPDATE addresses SET label = $3, name = $4, phone = $5, email = $6, city = $7, address = $8, area = $9, is_default = $10 WHERE id = $1 AND customer_id = $2",
        [id, customerId, saved.label ?? null, saved.name, saved.phone, saved.email ?? null, saved.city, saved.address, saved.area ?? null, isDefault],
      );
    } else {
      await insertAddress(c, customerId, saved, me.addresses.length);
    }
    if (isDefault) await c.query("UPDATE addresses SET is_default = (id = $2) WHERE customer_id = $1", [customerId, id]);
    await c.query("UPDATE customers SET updated_at = now() WHERE id = $1", [customerId]);
    return { ok: true as const, id };
  }, `customer:${customerId}`);
}

export function deleteAddress(customerId: string, id: string): Promise<void> {
  return tx(async (c) => {
    const { rows } = await c.query<{ is_default: boolean }>("DELETE FROM addresses WHERE id = $1 AND customer_id = $2 RETURNING is_default", [id, customerId]);
    // Keep one default if any addresses remain
    if (rows[0]?.is_default) {
      await c.query("UPDATE addresses SET is_default = true WHERE id = (SELECT id FROM addresses WHERE customer_id = $1 ORDER BY position, id LIMIT 1)", [customerId]);
    }
  }, `customer:${customerId}`);
}

export async function setDefaultAddress(customerId: string, id: string): Promise<void> {
  await cachedPool().query(
    "UPDATE addresses SET is_default = (id = $2) WHERE customer_id = $1 AND EXISTS (SELECT 1 FROM addresses WHERE id = $2 AND customer_id = $1)",
    [customerId, id],
  );
}

/** Merges this device's wishlist into the account (or replaces it) and returns the result. */
export function syncWishlist(customerId: string, local: string[], replace: boolean): Promise<string[]> {
  return tx(async (c) => {
    const { rows } = await c.query<{ wishlist: string[] }>("SELECT wishlist FROM customers WHERE id = $1", [customerId]);
    if (!rows[0]) return [];
    const wanted = replace ? mergeWishlists([], local) : mergeWishlists(rows[0].wishlist, local);
    const { rows: known } = await c.query<{ id: string }>("SELECT id FROM products WHERE id = ANY($1::text[])", [wanted]);
    const ok = new Set(known.map((k) => k.id));
    const wishlist = wanted.filter((id) => ok.has(id));
    await c.query("UPDATE customers SET wishlist = $2, updated_at = now() WHERE id = $1", [customerId, wishlist]);
    return wishlist;
  }, `customer:${customerId}`);
}

// ---------------------------------------------------------------- orders

const MINE = "WHERE (o.customer_id = $1 OR ($2::text IS NOT NULL AND o.customer_id IS NULL AND o.phone = $2))";

/** Orders placed while signed in, plus guest orders made with the verified mobile number. */
export async function ordersFor(c: Customer): Promise<Order[]> {
  return selectOrders(await live(), MINE, [c.id, c.phone ?? null]);
}

export async function orderFor(c: Customer, number: string): Promise<Order | undefined> {
  return (await selectOrders(await live(), `${MINE} AND o.number = $3`, [c.id, c.phone ?? null, number]))[0];
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
 * fulfilment, returns and tax records, but are no longer linked to the account
 * (the orders.customer_id foreign key is ON DELETE SET NULL).
 */
export function deleteAccount(customerId: string): Promise<void> {
  return tx(async (c) => {
    await c.query("DELETE FROM customers WHERE id = $1", [customerId]);
    await writeAudit(c, customerId, "customer.delete", customerId, "account deleted by customer");
  });
}
