import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth";
import { getCustomer } from "@/lib/server/customers";
import { googleEnabled } from "@/lib/server/google";
import { OtpForm } from "../OtpForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  google_disabled: "Google sign-in isn’t set up yet. Please use your mobile number.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "That sign-in link expired. Please try again.",
  google_failed: "We couldn’t sign you in with Google. Please try again or use your mobile number.",
};

export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCustomer()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="texture mb-6 p-8 text-center">
        <h1 className="text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-ink-soft">Track orders, save addresses and keep your wishlist on every device. New here? Signing in creates your account.</p>
      </div>
      {error && <p className="mb-4 bg-sale/10 p-3 text-sm text-sale" role="alert">{error}</p>}
      <div className="space-y-6 bg-white p-6">
        <OtpForm next={next} />
        {googleEnabled() && (
          <>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
            {/* A plain link: the OAuth start is a full-page redirect, not a client navigation */}
            <a href={`/api/auth/google/start?next=${encodeURIComponent(next)}`} className="btn btn-secondary w-full">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              Continue with Google
            </a>
          </>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        By continuing you agree to our <Link href="/pages/terms" className="underline">terms</Link> and <Link href="/pages/privacy" className="underline">privacy policy</Link>.
        <br />Just want to check an order? <Link href="/track" className="underline">Track it without signing in</Link>.
      </p>
    </div>
  );
}
