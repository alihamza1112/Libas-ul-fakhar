import type { Metadata } from "next";
import { requireCustomer } from "@/lib/server/customers";
import { AccountShell } from "../AccountShell";
import { defaultAddressAction, deleteAddressAction } from "../actions";
import { AddressEditor } from "./AddressForm";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const me = await requireCustomer("/account/addresses");
  return (
    <AccountShell customer={me} active="addresses" title="Address book">
      <div className="space-y-4">
        {me.addresses.map((a) => (
          <div key={a.id} className="bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm">
                <p className="mb-1 font-medium">
                  {a.label || "Address"}
                  {a.isDefault && <span className="ms-2 rounded-full bg-sand px-2 py-0.5 text-xs font-normal">Default</span>}
                </p>
                <p>{a.name} · {a.phone}</p>
                <p className="text-ink-soft">{a.address}{a.area ? `, ${a.area}` : ""}, {a.city}</p>
              </div>
              <div className="flex items-center gap-3">
                {!a.isDefault && (
                  <form action={defaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-xs underline">Make default</button>
                  </form>
                )}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-muted underline hover:text-sale">Remove</button>
                </form>
              </div>
            </div>
            <AddressEditor key={JSON.stringify(a)} address={a} />
          </div>
        ))}
        {me.addresses.length === 0 && <p className="bg-white p-5 text-sm text-muted">No saved addresses yet. Your default address fills in checkout automatically.</p>}
        {me.addresses.length < 10 && <AddressEditor defaults={{ name: me.name, phone: me.phone }} />}
      </div>
    </AccountShell>
  );
}
