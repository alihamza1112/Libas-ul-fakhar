import { test } from "node:test";
import assert from "node:assert/strict";

// parseIdToken is pure, but its module imports "server-only", which throws outside
// Next. Resolve that import to an empty module for this test.
import { register } from "node:module";
register("data:text/javascript,export async function resolve(s,c,n){if(s==='server-only')return{url:'data:text/javascript,',shortCircuit:true};return n(s,c)}");

const { parseIdToken } = await import("./google.ts");

const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tok = (claims: object) => `${enc({ alg: "RS256" })}.${enc(claims)}.sig`;
const NOW = Date.parse("2026-10-22T10:00:00Z");
const good = { iss: "https://accounts.google.com", aud: "client-1", exp: NOW / 1000 + 600, sub: "1234", email: "a@b.pk", email_verified: true, name: "Ayesha" };

test("valid Google ID token claims", () => {
  assert.deepEqual(parseIdToken(tok(good), "client-1", NOW), { sub: "1234", email: "a@b.pk", emailVerified: true, name: "Ayesha" });
});

test("rejects wrong issuer, audience, expiry and malformed tokens", () => {
  assert.throws(() => parseIdToken(tok({ ...good, iss: "https://evil.example" }), "client-1", NOW), /issuer/);
  assert.throws(() => parseIdToken(tok({ ...good, aud: "other-client" }), "client-1", NOW), /audience/);
  assert.throws(() => parseIdToken(tok({ ...good, exp: NOW / 1000 - 1 }), "client-1", NOW), /Expired/);
  assert.throws(() => parseIdToken("not-a-token", "client-1", NOW), /Malformed/);
});
