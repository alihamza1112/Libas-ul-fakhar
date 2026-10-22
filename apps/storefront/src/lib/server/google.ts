import "server-only";
import { createHash, randomBytes } from "crypto";
import { SITE } from "../site.ts";

// Google sign-in (FR-ACC-01): OAuth 2.0 authorization code flow with PKCE and a
// state check. Enabled when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.
// The ID token comes straight from Google's token endpoint over TLS in exchange
// for our client secret, so its claims are trusted after checking iss/aud/exp.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_COOKIE = "luf_oauth";

export function googleEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(): string {
  return `${SITE.url}/api/auth/google/callback`;
}

export function startGoogle(next: string): { url: string; cookie: string } {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: `${AUTH_URL}?${params}`, cookie: JSON.stringify({ state, verifier, next }) };
}

export interface GoogleProfile {
  sub: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

export class GoogleAuthError extends Error {}

export async function finishGoogle(code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new GoogleAuthError(`Token exchange failed (${res.status})`);
  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) throw new GoogleAuthError("No ID token returned");
  return parseIdToken(idToken, process.env.GOOGLE_CLIENT_ID!, Date.now());
}

/** Validates the claims of an ID token received directly from Google's token endpoint. */
export function parseIdToken(idToken: string, clientId: string, now: number): GoogleProfile {
  const payload = idToken.split(".")[1];
  if (!payload) throw new GoogleAuthError("Malformed ID token");
  let c: Record<string, unknown>;
  try {
    c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new GoogleAuthError("Malformed ID token");
  }
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") throw new GoogleAuthError("Wrong issuer");
  if (c.aud !== clientId) throw new GoogleAuthError("Wrong audience");
  if (typeof c.exp !== "number" || c.exp * 1000 < now) throw new GoogleAuthError("Expired ID token");
  if (typeof c.sub !== "string" || !c.sub) throw new GoogleAuthError("Missing subject");
  return {
    sub: c.sub,
    email: typeof c.email === "string" ? c.email : undefined,
    emailVerified: c.email_verified === true || c.email_verified === "true",
    name: typeof c.name === "string" ? c.name : undefined,
  };
}
