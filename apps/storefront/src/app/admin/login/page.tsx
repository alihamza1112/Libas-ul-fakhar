"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <div className="admin grid min-h-screen lg:grid-cols-2">
      <div className="texture relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" />
        <div className="absolute inset-x-12 bottom-12 text-ivory">
          <p className="font-display text-4xl leading-tight">Garments worn with pride.</p>
          <p className="mt-2 text-sm text-ivory/80">Manage orders, products and stock for the Libas-ul-Fakhar store.</p>
        </div>
      </div>
      <div className="grid place-items-center px-4 py-12">
        <form action={action} className="w-full max-w-sm animate-rise-in space-y-6">
          <div className="space-y-5">
            <Image src="/brand/logo-full.png" alt="Libas-ul-Fakhar" width={958} height={439} className="h-14 w-auto" preload />
            <div>
              <h1>Sign in to the back office</h1>
              <p className="mt-1 text-[13px] text-muted">Enter the admin password to continue.</p>
            </div>
          </div>
          <div>
            <label htmlFor="admin-password" className="label">Password</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required autoFocus className="field" />
          </div>
          {state.error && <p className="alert alert-danger" role="alert">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </div>
  );
}
