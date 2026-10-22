"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import type { Customer } from "@/lib/types";
import { profileAction, type FormState } from "../actions";
import { OtpForm } from "../OtpForm";

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState<FormState, FormData>(profileAction, {});
  const googleEmail = !!customer.googleSub && !!customer.email;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Name
        <input name="name" defaultValue={customer.name} autoComplete="name" className="field mt-1" aria-invalid={state.field === "name"} />
      </label>
      <label className="text-sm">Email {googleEmail && <span className="text-xs text-muted">(verified by Google)</span>}
        <input name="email" type="email" defaultValue={customer.email} autoComplete="email" readOnly={googleEmail} className={`field mt-1 ${googleEmail ? "bg-cream" : ""}`} aria-invalid={state.field === "email"} />
      </label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="marketing" defaultChecked={customer.marketingOptIn} className="mt-1 h-4 w-4 accent-ink" />
        <span>Send me offers and new arrivals by SMS, WhatsApp or email. You can change this any time.</span>
      </label>
      {state.error && <p className="text-sm text-sale sm:col-span-2" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-success sm:col-span-2" role="status">Saved.</p>}
      <div className="sm:col-span-2"><button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button></div>
    </form>
  );
}

export function PhoneLink() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary">Add mobile number</button>;
  return <div className="max-w-sm"><OtpForm mode="link" onDone={() => router.refresh()} /></div>;
}

export function DeleteAccount() {
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await fetch("/api/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: confirmText }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error ?? "Could not delete the account.");
        return;
      }
      // Full reload on purpose: clears this account's data from the device
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    });
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-sm">Type <strong>DELETE</strong> to confirm
        <input name="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" className="field mt-1 max-w-xs" />
      </label>
      {error && <p className="text-sm text-sale" role="alert">{error}</p>}
      <button className="btn min-h-10 border border-sale px-4 text-sale hover:bg-sale hover:text-white" disabled={pending}>{pending ? "Deleting…" : "Delete my account"}</button>
    </form>
  );
}
