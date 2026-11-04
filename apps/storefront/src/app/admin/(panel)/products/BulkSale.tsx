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
    <details className="card disclosure">
      <summary>
        <span>
          Run a sale across a department or category
          <span className="block text-[12px] font-normal text-muted">Discount many products at once, with optional start and end dates.</span>
        </span>
      </summary>
      <div className="border-t border-[var(--admin-line)] px-5 py-4">
      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <label className="label-wrap">
          Department
          <select name="department" className="field" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.label}</option>)}
          </select>
        </label>
        <label className="label-wrap">
          Category
          <select name="category" className="field" disabled={dept === "all"}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </label>
        <label className="label-wrap">
          Discount %
          <input name="percent" type="number" min={1} max={90} defaultValue={20} className="field" />
        </label>
        <label className="label-wrap">
          Starts (PKT)
          <input name="startsAt" type="datetime-local" className="field" />
        </label>
        <label className="label-wrap">
          Ends (PKT)
          <input name="endsAt" type="datetime-local" className="field" />
        </label>
        <div className="flex gap-2">
          <button name="intent" value="apply" className="btn btn-primary flex-1" disabled={pending}>Apply</button>
          <button
            name="intent"
            value="clear"
            className="btn btn-secondary"
            disabled={pending}
            onClick={(e) => { if (!confirm("Remove the sale price from every product in this scope?")) e.preventDefault(); }}
          >
            Clear
          </button>
        </div>
      </form>
      <p className="mt-3 text-[12px] text-muted">Replaces any existing sale on the matching products. Sale prices are rounded to end in 90. Leave dates empty to start now / run until cleared.</p>
      {state.error && <p className="alert alert-danger mt-3" role="alert">{state.error}</p>}
      {state.message && <p className="alert alert-success mt-3" role="status">{state.message}</p>}
      </div>
    </details>
  );
}
