import { notFound } from "next/navigation";
import { toInput } from "@/lib/productInput";
import { adminListProducts, listAudit, requestTime } from "@/lib/server/store";
import { boxChoicesFrom } from "../boxChoices";
import { fmtDate } from "@/components/OrderView";
import { ProductEditor } from "../ProductEditor";
import { Badge, Card, PageHeader, PRODUCT_TONE } from "../../ui";

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
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={product.name}
        description={<>Created {fmtDate(product.createdAt)}{product.updatedAt ? ` · updated ${fmtDate(product.updatedAt)}` : ""}</>}
        actions={<Badge tone={PRODUCT_TONE[product.status]}>{product.status[0].toUpperCase() + product.status.slice(1)}</Badge>}
      />
      {sp.saved && <p className="alert alert-success" role="status">Saved. The store shows the change immediately.</p>}
      {sp.created && <p className="alert alert-success" role="status">Product created{product.status !== "active" ? " as a draft. Set status to Active when it's ready to sell." : "."}</p>}

      <ProductEditor key={product.updatedAt ?? product.id} initial={toInput(product)} productId={product.id} previewNow={await requestTime()} boxChoices={product.bundle ? boxChoicesFrom(all.filter((p) => p.id !== product.id)) : boxChoicesFrom(all)} />

      <Card title="History">
        {history.length ? (
          <ol className="relative space-y-4 border-s border-[var(--admin-line)] ps-5 text-[13px]">
            {history.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -start-[25px] top-1.5 h-2 w-2 rounded-full bg-[var(--admin-line-strong)] ring-4 ring-white" aria-hidden />
                <span className="font-medium">{ACTION_LABEL[h.action] ?? h.action}</span>
                <span className="text-muted"> · {fmtDate(h.at)} · {h.by}</span>
                {h.detail && <p className="mt-0.5 text-[12px] text-muted">{h.detail}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[13px] text-muted">No changes recorded since this product was seeded.</p>
        )}
      </Card>
    </div>
  );
}
