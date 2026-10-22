import { CITIES, normalisePhone } from "./cities.ts";
import type { Address } from "./types";

// Pure account rules (FR-ACC-01/05): OTP throttling and checks, address
// validation shared by checkout and the address book, wishlist merging.

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const OTP_WINDOW_MS = 15 * 60 * 1000;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const SESSION_TTL_MS = 30 * 24 * 3600 * 1000;

export type SendCheck = { ok: true } | { ok: false; retryInSec: number; message: string };

/** Whether another code may be sent to a number, given recent send times. */
export function canSendOtp(sentAt: string[], now: number): SendCheck {
  const recent = sentAt.map((s) => Date.parse(s)).filter((t) => now - t < OTP_WINDOW_MS).sort((a, b) => b - a);
  if (recent.length && now - recent[0] < OTP_RESEND_COOLDOWN_MS) {
    const s = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - recent[0])) / 1000);
    return { ok: false, retryInSec: s, message: `Please wait ${s}s before requesting another code.` };
  }
  if (recent.length >= OTP_MAX_SENDS_PER_WINDOW) {
    const s = Math.ceil((OTP_WINDOW_MS - (now - recent[recent.length - 1])) / 1000);
    return { ok: false, retryInSec: s, message: `Too many codes requested. Try again in ${Math.ceil(s / 60)} min.` };
  }
  return { ok: true };
}

export type OtpOutcome = "ok" | "missing" | "expired" | "locked" | "wrong";

/** Decides a verification attempt. `matches` is the constant-time hash comparison result. */
export function checkOtp(rec: { expiresAt: string; attempts: number } | undefined, matches: boolean, now: number): { outcome: OtpOutcome; attemptsLeft: number } {
  if (!rec) return { outcome: "missing", attemptsLeft: 0 };
  if (now >= Date.parse(rec.expiresAt)) return { outcome: "expired", attemptsLeft: 0 };
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return { outcome: "locked", attemptsLeft: 0 };
  if (matches) return { outcome: "ok", attemptsLeft: OTP_MAX_ATTEMPTS - rec.attempts };
  return { outcome: rec.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "wrong", attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - rec.attempts - 1) };
}

export const OTP_MESSAGE: Record<Exclude<OtpOutcome, "ok">, string> = {
  missing: "Request a code first.",
  expired: "That code has expired. Request a new one.",
  locked: "Too many wrong attempts. Request a new code.",
  wrong: "That code isn’t right.",
};

export type AddressResult = { ok: true; address: Address } | { ok: false; field: keyof Address; message: string };

/** Pakistan address format (FR-CHK-03). */
export function validateAddress(a: Partial<Address>): AddressResult {
  const name = (a.name ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, field: "name", message: "Please enter your full name." };
  const phone = normalisePhone(a.phone ?? "");
  if (!phone) return { ok: false, field: "phone", message: "Enter a valid Pakistani mobile number (03xx xxxxxxx)." };
  const email = (a.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: "email", message: "Enter a valid email address." };
  if (!CITIES.includes(a.city ?? "")) return { ok: false, field: "city", message: "Please choose your city." };
  const address = (a.address ?? "").trim();
  if (address.length < 10 || address.length > 300) return { ok: false, field: "address", message: "Please enter your complete address (house, street, area)." };
  const area = (a.area ?? "").trim().slice(0, 120);
  return { ok: true, address: { name, phone, ...(email ? { email } : {}), city: a.city!, address, ...(area ? { area } : {}) } };
}

/** Server list first (other devices), then anything new from this device. */
export function mergeWishlists(server: string[], local: string[], max = 200): string[] {
  const out = [...new Set([...server, ...local])].filter((id) => /^p\d{3,}$/.test(id));
  return out.slice(0, max);
}

/** Only same-site paths are allowed as post-login destinations (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}
