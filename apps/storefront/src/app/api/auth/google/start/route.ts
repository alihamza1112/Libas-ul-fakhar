import { cookies } from "next/headers";
import { safeNext } from "@/lib/auth";
import { googleEnabled, OAUTH_COOKIE, startGoogle } from "@/lib/server/google";

export async function GET(req: Request) {
  if (!googleEnabled()) return Response.redirect(new URL("/account/login?error=google_disabled", req.url), 303);
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const { url, cookie } = startGoogle(next);
  (await cookies()).set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax", // must survive the top-level redirect back from Google
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return Response.redirect(url, 303);
}
