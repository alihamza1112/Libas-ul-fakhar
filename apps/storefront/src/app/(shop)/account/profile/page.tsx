import type { Metadata } from "next";
import { requireCustomer } from "@/lib/server/customers";
import { AccountShell } from "../AccountShell";
import { DeleteAccount, PhoneLink, ProfileForm } from "./ProfileForms";

export const metadata: Metadata = { title: "Profile & privacy", robots: { index: false } };

export default async function ProfilePage() {
  const me = await requireCustomer("/account/profile");
  return (
    <AccountShell customer={me} active="profile" title="Profile & privacy">
      <div className="space-y-6">
        <section className="bg-white p-5">
          <h2 className="mb-4 text-2xl">Your details</h2>
          <ProfileForm customer={me} />
        </section>

        <section id="phone" className="bg-white p-5">
          <h2 className="mb-2 text-2xl">Sign-in methods</h2>
          <ul className="mb-4 space-y-1 text-sm">
            <li>Mobile number: {me.phone ? <><strong>{me.phone}</strong> <span className="text-success">· verified</span></> : <span className="text-muted">not added</span>}</li>
            <li>Google: {me.googleSub ? <strong>connected{me.email ? ` (${me.email})` : ""}</strong> : <span className="text-muted">not connected</span>}</li>
          </ul>
          {!me.phone && (
            <>
              <p className="mb-3 text-sm text-ink-soft">Verify your mobile number to sign in with it and to see orders you placed as a guest.</p>
              <PhoneLink />
            </>
          )}
        </section>

        <section className="bg-white p-5">
          <h2 className="mb-2 text-2xl">Your data</h2>
          <p className="mb-3 text-sm text-ink-soft">Download a copy of everything we hold about your account: details, addresses, wishlist and orders.</p>
          <a href="/api/account/export" className="btn btn-secondary">Download my data (JSON)</a>
        </section>

        <section className="border border-sale/30 bg-white p-5">
          <h2 className="mb-2 text-2xl">Delete account</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Removes your account, saved addresses and wishlist, and signs you out everywhere. Order records are kept for delivery, returns and tax purposes but are no longer linked to an account.
          </p>
          <DeleteAccount />
        </section>
      </div>
    </AccountShell>
  );
}
