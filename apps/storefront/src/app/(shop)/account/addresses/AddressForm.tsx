"use client";

import { useActionState, useEffect, useState } from "react";
import { CITIES } from "@/lib/cities";
import type { SavedAddress } from "@/lib/types";
import { addressAction, type FormState } from "../actions";

export function AddressForm({ address, defaults, onDone }: { address?: SavedAddress; defaults?: { name?: string; phone?: string }; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addressAction, {});
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);
  const err = (f: string) => (state.field === f ? state.error : undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      <label className="text-sm">Label (optional)
        <input name="label" defaultValue={address?.label} placeholder="Home, Office…" maxLength={30} className="field mt-1" />
      </label>
      <label className="text-sm">Full name *
        <input name="name" defaultValue={address?.name ?? defaults?.name} autoComplete="name" required className="field mt-1" aria-invalid={!!err("name")} />
        {err("name") && <span className="mt-1 block text-xs text-sale">{err("name")}</span>}
      </label>
      <label className="text-sm">Mobile number *
        <input name="phone" type="tel" defaultValue={address?.phone ?? defaults?.phone} autoComplete="tel" required placeholder="03xx xxxxxxx" className="field mt-1" aria-invalid={!!err("phone")} />
        {err("phone") && <span className="mt-1 block text-xs text-sale">{err("phone")}</span>}
      </label>
      <label className="text-sm">City *
        <select name="city" defaultValue={address?.city ?? ""} required className="field mt-1" aria-invalid={!!err("city")}>
          <option value="">Select your city</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {err("city") && <span className="mt-1 block text-xs text-sale">{err("city")}</span>}
      </label>
      <label className="text-sm sm:col-span-2">Complete address *
        <textarea name="address" rows={2} defaultValue={address?.address} autoComplete="street-address" required placeholder="House #, street, block / sector, area" className="field mt-1" aria-invalid={!!err("address")} />
        {err("address") && <span className="mt-1 block text-xs text-sale">{err("address")}</span>}
      </label>
      <label className="text-sm">Nearest landmark
        <input name="area" defaultValue={address?.area} className="field mt-1" />
      </label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault} className="h-4 w-4 accent-ink" /> Use as default address
      </label>
      {state.error && !state.field && <p className="text-sm text-sale sm:col-span-2" role="alert">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : address ? "Save address" : "Add address"}</button>
        {onDone && <button type="button" onClick={onDone} className="btn btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}

export function AddressEditor({ address, defaults }: { address?: SavedAddress; defaults?: { name?: string; phone?: string } }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return address ? (
      <button type="button" onClick={() => setOpen(true)} className="text-xs underline">Edit</button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">Add a new address</button>
    );
  }
  return (
    <div className={address ? "mt-4 border-t border-line pt-4" : "bg-white p-5"}>
      <AddressForm address={address} defaults={defaults} onDone={() => setOpen(false)} />
    </div>
  );
}
