import Link from "next/link";
import { notFound } from "next/navigation";
import { toInput } from "@/lib/productInput";
import { adminListProducts, listAudit, requestTime } from "@/lib/server/store";
import { boxChoicesFrom } from "../boxChoices";
import { fmtDate } from "@/components/OrderView";
import { ProductEditor } from "../ProductEditor";

const ACTION_LABEL: Record<string, string> = {
  "product.create": "Created",
  "product.update": "Edited",
  "stock.set": "Stock adjusted",
  "stock.restock_skipped": "Restock skipped",
};

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const all = await adminListProducts();
  const product = all.find((p) => p.id === id);
  if (!product) notFound();
  const history = await listAudit(id, 30);

  return (
    <div className="space-y-4">
      <Link href="/admin/products" className="text-sm underline">← Products</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl">{product.name}</h1>
        <p className="text-xs text-muted">{product.id} · created {fmtDate(product.createdAt)}{product.updatedAt ? ` · updated ${fmtDate(product.updatedAt)}` : ""}</p>
      </div>
      {sp.saved && <p className="bg-emerald-50 p-3 text-sm text-success" role="status">Saved. The store shows the change immediately.</p>}
      {sp.created && <p className="bg-emerald-50 p-3 text-sm text-success" role="status">Product created{product.status !== "active" ? " as a draft. Set status to Active when it's ready to sell." : "."}</p>}

      <ProductEditor key={product.updatedAt ?? product.id} initial={toInput(product)} productId={product.id} previewNow={await requestTime()} boxChoices={product.bundle ? boxChoicesFrom(all.filter((p) => p.id !== product.id)) : boxChoicesFrom(all)} />

      <section className="bg-white p-5">
        <h2 className="mb-3 text-xl">History</h2>
        {history.length ? (
          <ul className="space-y-2 text-sm">
            {history.map((h, i) => (
              <li key={i} className="border-s border-line ps-3">
                <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                <span className="text-muted"> · {fmtDate(h.at)} · {h.by}</span>
                {h.detail && <p className="text-xs text-muted">{h.detail}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No changes recorded since this product was seeded.</p>
        )}
      </section>
    </div>
  );
}
