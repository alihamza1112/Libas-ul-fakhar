import { cookies } from "next/headers";
import { safeNext } from "@/lib/auth";
import { startSession, upsertGoogleCustomer } from "@/lib/server/customers";
import { finishGoogle, googleEnabled, OAUTH_COOKIE } from "@/lib/server/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (code: string) => Response.redirect(new URL(`/account/login?error=${code}`, req.url), 303);
  if (!googleEnabled()) return fail("google_disabled");

  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  if (url.searchParams.get("error")) return fail("google_cancelled");

  let saved: { state?: string; verifier?: string; next?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    /* treated as missing */
  }
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  // State must match the cookie we set when starting: blocks login CSRF
  if (!saved.state || !saved.verifier || !state || state !== saved.state || !code) return fail("google_state");

  try {
    const profile = await finishGoogle(code, saved.verifier);
    const customer = await upsertGoogleCustomer(profile);
    await startSession(customer.id);
    return Response.redirect(new URL(safeNext(saved.next), req.url), 303);
  } catch (e) {
    console.error("[google] sign-in failed", e);
    return fail("google_failed");
  }
}
