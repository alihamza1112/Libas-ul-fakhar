"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useStore } from "@/components/StoreProvider";
import { signOutAction } from "./actions";

/** After signing in (a client-side navigation), pull account state and merge the wishlist. */
export function AccountSync() {
  const { refreshAccount } = useStore();
  const router = useRouter();
  useEffect(() => {
    // Re-render server data (e.g. wishlist count) once the device wishlist has been merged
    refreshAccount().then((merged) => merged && router.refresh());
  }, [refreshAccount, router]);
  return null;
}

/** Signs out, then reloads so nothing from this account stays in memory on a shared device. */
export function SignOutButton({ className }: { className: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOutAction();
          // Full reload on purpose: drops this account's client state on shared devices
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/");
        })
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
