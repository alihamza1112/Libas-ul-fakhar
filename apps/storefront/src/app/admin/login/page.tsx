"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login } from "../actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <div className="texture grid min-h-screen place-items-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 bg-ivory p-8 shadow-xl">
        <Image src="/brand/logo-full.png" alt="Libas-ul-Fakhar" width={958} height={439} className="mx-auto h-16 w-auto" />
        <h1 className="text-center text-2xl">Back office</h1>
        <label className="block text-sm">
          Password
          <input name="password" type="password" autoComplete="current-password" required className="field mt-1" />
        </label>
        {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}
