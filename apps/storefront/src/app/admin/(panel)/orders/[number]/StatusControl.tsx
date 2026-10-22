"use client";

import { useActionState } from "react";
import { STATUS_LABEL, TRANSITIONS } from "@/lib/orderStatus";
import type { OrderStatus } from "@/lib/types";
import { changeStatus } from "../../../actions";

export function StatusControl({ number, status }: { number: string; status: OrderStatus }) {
  const [state, action, pending] = useActionState(changeStatus, {});
  const next = TRANSITIONS[status];
  if (!next.length) return <p className="text-sm text-muted">This order is closed — no further status changes.</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="number" value={number} />
      <label className="block text-sm">
        Note (optional, visible in history)
        <input name="note" className="field mt-1" placeholder="e.g. Booked with TCS, CN 12345" maxLength={300} />
      </label>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <button
            key={s}
            name="to"
            value={s}
            disabled={pending}
            className={`btn min-h-10 px-4 ${s === "cancelled" || s === "failed_delivery" ? "btn-secondary" : "btn-primary"}`}
            onClick={(e) => { if (s === "cancelled" && !confirm("Cancel this order and restock its items?")) e.preventDefault(); }}
          >
            Mark {STATUS_LABEL[s].toLowerCase()}
          </button>
        ))}
      </div>
      {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-success" role="status">Status updated. Customer notification queued.</p>}
    </form>
  );
}
