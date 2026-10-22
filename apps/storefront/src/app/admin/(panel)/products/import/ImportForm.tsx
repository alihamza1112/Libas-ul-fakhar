"use client";

import Link from "next/link";
import { useActionState } from "react";
import { formatPKR } from "@/lib/pricing";
import { importAction, type ImportState } from "../../../products-actions";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importAction, {});
  const plan = state.plan;

  if (state.applied && plan) {
    return (
      <section className="space-y-4 bg-white p-6">
        <h2 className="text-2xl">Import complete</h2>
        <p className="text-sm">
          <strong>{plan.created.length}</strong> product(s) created, <strong>{plan.updated.length}</strong> updated, <strong>{plan.variantCount}</strong> variants written from {state.fileName}. The store is updated.
        </p>
        <div className="flex gap-2">
          <Link href="/admin/products" className="btn btn-primary min-h-10 px-4">View products</Link>
          <form action={action}><button name="intent" value="reset" className="btn btn-secondary min-h-10 px-4">Import another file</button></form>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3 bg-white p-6">
        <label className="block text-sm" htmlFor="csv-file">CSV file (max 2 MB, 5,000 rows)</label>
        <input id="csv-file" name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm file:me-3 file:border file:border-ink file:bg-transparent file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.12em]" />
        <button name="intent" value="preview" className="btn btn-primary min-h-10 px-5" disabled={pending}>{pending ? "Checking…" : "Check file"}</button>
        <p className="text-xs text-muted">Nothing is saved until you review the preview and confirm.</p>
        {state.error && <p className="text-sm text-sale" role="alert">{state.error}</p>}
      </form>

      {plan && (
        <section className="space-y-4 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">Preview · {state.fileName}</h2>
            <p className="text-sm text-muted">{plan.created.length} new · {plan.updated.length} updates · {plan.variantCount} variants</p>
          </div>

          {plan.warnings.map((w) => <p key={w} className="bg-amber-50 p-3 text-sm">{w}</p>)}

          {plan.errors.length > 0 ? (
            <div className="space-y-2">
              <p className="bg-sale/10 p-3 text-sm text-sale" role="alert">
                {plan.errors.length} problem(s) found. Fix them in your spreadsheet and upload again — nothing has been imported.
              </p>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-ink text-xs uppercase tracking-[0.1em] text-muted"><th className="py-2 text-start font-normal">Row</th><th className="py-2 text-start font-normal">Handle</th><th className="py-2 text-start font-normal">Problem</th></tr></thead>
                  <tbody>
                    {plan.errors.map((e, i) => (
                      <tr key={i} className="border-b border-line"><td className="py-1.5 tabular-nums">{e.row}</td><td className="py-1.5 font-mono text-xs">{e.handle || "—"}</td><td className="py-1.5">{e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-[28rem] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-ink text-xs uppercase tracking-[0.1em] text-muted"><th className="py-2 text-start font-normal">Action</th><th className="py-2 text-start font-normal">Product</th><th className="py-2 text-start font-normal">Status</th><th className="py-2 text-end font-normal">Price</th><th className="py-2 text-end font-normal">Variants / stock</th></tr></thead>
                  <tbody>
                    {plan.products.map((p) => (
                      <tr key={p.id} className="border-b border-line">
                        <td className="py-1.5">{plan.created.includes(p.slug) ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs">New</span> : <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs">Update</span>}</td>
                        <td className="py-1.5">{p.name}<span className="block font-mono text-xs text-muted">{p.slug}</span></td>
                        <td className="py-1.5">{p.status}</td>
                        <td className="py-1.5 text-end tabular-nums">{formatPKR(p.basePrice)}{p.sale && <span className="block text-xs text-sale">sale {formatPKR(p.sale.price)}</span>}</td>
                        <td className="py-1.5 text-end tabular-nums">{p.variants.length} / {p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <form action={action} className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
                <input type="hidden" name="csv" value={state.csv ?? ""} />
                <button name="intent" value="apply" className="btn btn-primary min-h-10 px-5" disabled={pending}>
                  {pending ? "Importing…" : `Import ${plan.products.length} product(s)`}
                </button>
                <p className="text-xs text-muted">Updates replace each product’s colours, sizes and variants with the file’s rows. Products not in the file are untouched.</p>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
