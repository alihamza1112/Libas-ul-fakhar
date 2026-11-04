import Link from "next/link";
import type { OrderStatus, ProductStatus } from "@/lib/types";

// Shared building blocks for back-office pages. Styling lives in globals.css under `.admin`.

export function PageHeader({ title, description, back, actions }: { title: string; description?: React.ReactNode; back?: { href: string; label: string }; actions?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {back && (
        <Link href={back.href} className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1>{title}</h1>
          {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, action, flush = false, className = "", children }: { title?: string; action?: React.ReactNode; flush?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-[13px] text-muted">{children}</div>}
    </div>
  );
}

type Tone = "neutral" | "info" | "progress" | "success" | "warning" | "danger" | "muted";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: "warning",
  confirmed: "info",
  packed: "info",
  shipped: "progress",
  out_for_delivery: "progress",
  delivered: "success",
  cancelled: "muted",
  failed_delivery: "danger",
  return_requested: "warning",
  returned: "muted",
  refunded: "muted",
};

export const PRODUCT_TONE: Record<ProductStatus, Tone> = {
  active: "success",
  draft: "neutral",
  archived: "muted",
};

/** Pill links used as quick filters above lists. */
export function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`pill ${active ? "pill-active" : ""}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
