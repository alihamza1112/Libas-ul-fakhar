"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerCanCancel } from "@/lib/orderStatus";
import { eta, OrderItems, OrderTimeline, OrderTotals } from "@/components/OrderView";
import { cancel, track, type TrackState } from "./actions";

export function TrackForm({ initialNumber }: { initialNumber?: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(track, { number: initialNumber });
  const [cState, cancelAction, cancelling] = useActionState<TrackState, FormData>(cancel, {});
  const view = cState.order && cState.order.number === state.order?.number ? cState : state;
  const order = view.order;

  return (
    <div className="space-y-10">
      <form action={action} className="mx-auto grid max-w-xl gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="number" defaultValue={state.number} className="field uppercase" placeholder="Order no. LUF-…" aria-label="Order number" required />
        <input name="phone" defaultValue={state.phone} className="field" type="tel" placeholder="Mobile 03xx…" aria-label="Mobile number used for the order" required />
        <button className="btn btn-primary" disabled={pending}>{pending ? "Checking…" : "Track"}</button>
      </form>
      {state.error && !order && <p className="text-center text-sm text-sale" role="alert">{state.error}</p>}

      {order && (
        <div className="mx-auto max-w-3xl space-y-8 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">Order {order.number}</h2>
            <p className="text-sm text-muted">Delivering to {order.address.city} · {eta(order)}</p>
          </div>
          {view.message && <p className="bg-sand p-3 text-sm" role="status">{view.message}</p>}
          {view.error && <p className="text-sm text-sale" role="alert">{view.error}</p>}
          <OrderTimeline order={order} />
          <div className="grid gap-6 md:grid-cols-2">
            <OrderItems order={order} />
            <div className="space-y-4">
              <OrderTotals order={order} />
              {customerCanCancel(order.status) && (
                <form action={cancelAction}>
                  <input type="hidden" name="number" value={order.number} />
                  <input type="hidden" name="phone" value={state.phone ?? ""} />
                  <button
                    className="btn btn-secondary w-full"
                    disabled={cancelling}
                    onClick={(e) => { if (!confirm("Cancel this order? This can't be undone.")) e.preventDefault(); }}
                  >
                    {cancelling ? "Cancelling…" : "Cancel order"}
                  </button>
                  <p className="mt-1 text-xs text-muted">Orders can be cancelled until they are shipped.</p>
                </form>
              )}
              {order.status === "delivered" && (
                <Link href="/pages/returns" className="btn btn-secondary w-full">Request exchange / return</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
