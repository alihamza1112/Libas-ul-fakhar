import { test } from "node:test";
import assert from "node:assert/strict";
import { canSendOtp, checkOtp, mergeWishlists, OTP_MAX_ATTEMPTS, safeNext, validateAddress } from "./auth.ts";

const T = Date.parse("2026-10-22T10:00:00Z");
const ago = (s: number) => new Date(T - s * 1000).toISOString();

test("OTP resend cooldown and window limit", () => {
  assert.deepEqual(canSendOtp([], T), { ok: true });
  const cool = canSendOtp([ago(10)], T);
  assert.equal(cool.ok, false);
  if (!cool.ok) assert.equal(cool.retryInSec, 20);
  assert.deepEqual(canSendOtp([ago(60)], T), { ok: true });
  const capped = canSendOtp([ago(60), ago(120), ago(300)], T);
  assert.equal(capped.ok, false);
  if (!capped.ok) assert.match(capped.message, /Too many codes/);
  // sends older than the window no longer count
  assert.deepEqual(canSendOtp([ago(60), ago(1000), ago(2000)], T), { ok: true });
});

test("OTP verification outcomes", () => {
  const rec = { expiresAt: new Date(T + 60_000).toISOString(), attempts: 0 };
  assert.equal(checkOtp(undefined, true, T).outcome, "missing");
  assert.equal(checkOtp(rec, true, T).outcome, "ok");
  assert.deepEqual(checkOtp(rec, false, T), { outcome: "wrong", attemptsLeft: OTP_MAX_ATTEMPTS - 1 });
  assert.equal(checkOtp({ ...rec, attempts: OTP_MAX_ATTEMPTS - 1 }, false, T).outcome, "locked");
  assert.equal(checkOtp({ ...rec, attempts: OTP_MAX_ATTEMPTS }, true, T).outcome, "locked"); // even the right code
  assert.equal(checkOtp({ ...rec, expiresAt: ago(1) }, true, T).outcome, "expired");
});

test("address validation normalises and reports the field", () => {
  const ok = validateAddress({ name: " Ali Khan ", phone: "+92 300 1234567", city: "Lahore", address: "House 1, Street 2, Gulberg", area: "" });
  assert.deepEqual(ok, { ok: true, address: { name: "Ali Khan", phone: "03001234567", city: "Lahore", address: "House 1, Street 2, Gulberg" } });
  const bad = validateAddress({ name: "Ali", phone: "12345", city: "Lahore", address: "House 1, Street 2" });
  assert.deepEqual(bad.ok ? null : bad.field, "phone");
  const badCity = validateAddress({ name: "Ali", phone: "03001234567", city: "Atlantis", address: "House 1, Street 2" });
  assert.equal(badCity.ok ? null : badCity.field, "city");
});

test("wishlist merge keeps server order, adds device items, drops junk", () => {
  assert.deepEqual(mergeWishlists(["p001", "p005"], ["p005", "p010", "<script>"]), ["p001", "p005", "p010"]);
  assert.equal(mergeWishlists([], Array.from({ length: 300 }, (_, i) => `p${String(i + 1).padStart(3, "0")}`)).length, 200);
});

test("post-login redirects stay on this site", () => {
  assert.equal(safeNext("/account/orders"), "/account/orders");
  assert.equal(safeNext("/checkout?x=1"), "/checkout?x=1");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "", undefined, "/x\r\nSet-Cookie: a=b"]) assert.equal(safeNext(bad), "/account");
});
