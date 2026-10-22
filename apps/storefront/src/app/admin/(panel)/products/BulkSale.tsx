"use client";

import { useActionState, useState } from "react";
import { DEPARTMENTS } from "@/lib/catalog";
import { bulkSaleAction, type BulkSaleState } from "../../products-actions";

/** Department/category-wide sale with dates that revert on their own (FR-PRM-01). */
export function BulkSale() {
  const [state, action, pending] = useActionState<BulkSaleState, FormData>(bulkSaleAction, {});
  const [dept, setDept] = useState("all");
  const cats = DEPARTMENTS.find((d) => d.slug === dept)?.categories ?? [];
  return (
    <details className="bg-white p-5">
      <summary className="cursor-pointer text-xl font-display">Run a sale across a department or category</summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <label className="text-sm">
          Department
          <select name="department" className="field mt-1" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Category
          <select name="category" className="field mt-1" disabled={dept === "all"}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Discount %
          <input name="percent" type="number" min={1} max={90} defaultValue={20} className="field mt-1" />
        </label>
        <label className="text-sm">
          Starts (PKT)
          <input name="startsAt" type="datetime-local" className="field mt-1" />
        </label>
        <label className="text-sm">
          Ends (PKT)
          <input name="endsAt" type="datetime-local" className="field mt-1" />
        </label>
        <div className="flex gap-2">
          <button name="intent" value="apply" className="btn btn-primary min-h-12 flex-1 px-3" disabled={pending}>Apply</button>
          <button
            name="intent"
            value="clear"
            className="btn btn-secondary min-h-12 px-3"
            disabled={pending}
            onClick={(e) => { if (!confirm("Remove the sale price from every product in this scope?")) e.preventDefault(); }}
          >
            Clear
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-muted">Replaces any existing sale on the matching products. Sale prices are rounded to end in 90. Leave dates empty to start now / run until cleared.</p>
      {state.error && <p className="mt-2 text-sm text-sale" role="alert">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-success" role="status">{state.message}</p>}
    </details>
  );
}
