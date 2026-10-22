import "server-only";
import { randomBytes } from "crypto";
import { connection } from "next/server";
import { computeTotals } from "../pricing";
import { canTransition, restocks } from "../orderStatus";
import { normalisePhone } from "../cities";
import { validateAddress } from "../auth";
import { materialize, salePriceForPercent } from "../productPricing";
import { nextProductId, validateProduct, type FieldErrors, type ProductInput } from "../productInput";
import { planImport, type ImportPlan } from "../productCsv";
import { imagesFor, removedImageIds } from "../productImages";
import { deleteMedia, deleteOrphans, mediaExists } from "./media";
import { audit, load, readDb, save, withLock, type DB } from "./db";
import type { Address, AuditEntry, CartLine, DepartmentSlug, Order, OrderStatus, PaymentMethod, Product } from "../types";

// Catalog, inventory, orders and notifications. Storage lives in ./db.

function findVariant(db: DB, sku: string) {
  for (const product of db.products) {
    const variant = product.variants.find((v) => v.sku === sku);
    if (variant) return { product, variant };
  }
  return undefined;
}

/** The current time for a request-time render (sale state, previews). */
export async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

// ---------------------------------------------------------------- catalog reads

/** All stored products (any status), without derived pricing. For the cached storefront catalogue. */
export async function readProducts(): Promise<Product[]> {
  return (await readDb()).products;
}

/** Live view for the back office: every status, priced as of now. */
export async function adminListProducts(): Promise<Product[]> {
  const db = await load();
  const now = Date.now();
  return db.products.map((p) => materialize(p, now));
}

export async function adminGetProduct(id: string): Promise<Product | undefined> {
  return (await adminListProducts()).find((p) => p.id === id);
}

/** Live price and stock for bag lines, used to re-validate before checkout (FR-CART-06). */
export async function liveLines(lines: CartLine[]) {
  const db = await load();
  const now = Date.now();
  return lines.slice(0, 30).map((l) => {
    const p = db.products.find((x) => x.id === l.productId && x.status === "active");
    const v = p?.variants.find((x) => x.sku === l.sku);
    return { sku: l.sku, stock: p && v ? (p.preOrder ? 99 : v.stock) : 0, price: p ? materialize(p, now).price : 0 };
  });
}

export async function skuExists(sku: string): Promise<boolean> {
  return !!findVariant(await load(), sku);
}

// ---------------------------------------------------------------- catalog writes

/** Housekeeping after uploads: drop files no product kept for a day. */
export async function cleanupUploads(): Promise<number> {
  const db = await readDb();
  return deleteOrphans(new Set(db.products.flatMap((p) => (p.images ?? []).map((i) => i.id))), 24 * 3600 * 1000);
}

export type SaveResult = { ok: true; product: Product } | { ok: false; errors: FieldErrors };

export function saveProduct(input: ProductInput, by: string): Promise<SaveResult> {
  return withLock(async () => {
    const db = await load();
    const current = input.id ? db.products.find((p) => p.id === input.id) : undefined;
    if (input.id && !current) return { ok: false, errors: { form: "This product no longer exists." } };
    const others = db.products.filter((p) => p.id !== current?.id);
    const nowIso = new Date().toISOString();
    const res = validateProduct(input, others, current, nowIso, nextProductId(db.products));
    if (!res.ok) return res;

    const p = res.product;
    // New photo ids must be real uploaded files (ids are random, so they can't be guessed)
    const added = (p.images ?? []).filter((i) => !(current?.images ?? []).some((c) => c.id === i.id));
    const missing = (await Promise.all(added.map((i) => mediaExists(i.id)))).some((ok) => !ok);
    if (missing) return { ok: false, errors: { images: "A photo is missing on the server. Please upload it again." } };
    if (current) {
      db.products = db.products.map((x) => (x.id === p.id ? p : x));
      audit(db, by, "product.update", p.id, describeChanges(current, p));
    } else {
      db.products.push(p);
      audit(db, by, "product.create", p.id, `${p.name} · ${p.variants.length} variants · ${p.status}`);
    }
    await save(db);
    // Delete photo files this edit removed, unless another product still uses them
    const stillUsed = new Set(db.products.flatMap((x) => (x.images ?? []).map((i) => i.id)));
    await deleteMedia(removedImageIds(current?.images, p.images).filter((id) => !stillUsed.has(id)));
    return { ok: true, product: materialize(p, Date.now()) };
  });
}

function rs(paisa: number) {
  return `Rs. ${(paisa / 100).toLocaleString("en-US")}`;
}

function describeChanges(a: Product, b: Product): string {
  const out: string[] = [];
  if (a.name !== b.name) out.push(`name "${a.name}" → "${b.name}"`);
  if (a.status !== b.status) out.push(`status ${a.status} → ${b.status}`);
  if (a.basePrice !== b.basePrice) out.push(`price ${rs(a.basePrice)} → ${rs(b.basePrice)}`);
  const sale = (p: Product) => (p.sale ? `${rs(p.sale.price)}${p.sale.startsAt ? ` from ${p.sale.startsAt}` : ""}${p.sale.endsAt ? ` until ${p.sale.endsAt}` : ""}` : "none");
  if (sale(a) !== sale(b)) out.push(`sale ${sale(a)} → ${sale(b)}`);
  const stockChanges = b.variants.filter((v) => a.variants.find((x) => x.sku === v.sku)?.stock !== v.stock).length;
  if (stockChanges) out.push(`${stockChanges} variant(s) stock/added`);
  const removed = a.variants.filter((v) => !b.variants.some((x) => x.sku === v.sku)).length;
  if (removed) out.push(`${removed} variant(s) removed`);
  for (const k of ["slug", "department", "category", "garment", "fabric", "fit", "description"] as const) if (a[k] !== b[k]) out.push(`${k} changed`);
  return out.join("; ") || "no changes";
}

/** CSV import: plan (validate) and, if `apply` and the plan is clean, write it all at once. */
export function importProducts(csv: string, apply: boolean, by: string): Promise<ImportPlan> {
  const run = async () => {
    const db = await load();
    const plan = planImport(csv, db.products, new Date().toISOString());
    if (!apply || plan.errors.length) return plan;
    const byId = new Map(plan.products.map((p) => [p.id, p]));
    db.products = [...db.products.map((p) => byId.get(p.id) ?? p), ...plan.products.filter((p) => !db.products.some((x) => x.id === p.id))];
    audit(db, by, "product.import", "catalog", `${plan.created.length} created, ${plan.updated.length} updated, ${plan.variantCount} variants`);
    for (const p of plan.products) audit(db, by, plan.created.includes(p.slug) ? "product.create" : "product.update", p.id, "via CSV import");
    await save(db);
    return plan;
  };
  return apply ? withLock(run) : run();
}

export interface BulkSaleInput {
  department: DepartmentSlug | "all";
  category?: string;
  percent: number; // 0 = clear sale
  startsAt?: string;
  endsAt?: string;
}

/** Category-wide sale with start/end dates that revert automatically (FR-PRM-01). */
export function bulkSale(input: BulkSaleInput, by: string): Promise<number> {
  return withLock(async () => {
    const db = await load();
    let n = 0;
    db.products = db.products.map((p) => {
      if (p.status === "archived") return p;
      if (input.department !== "all" && p.department !== input.department) return p;
      if (input.category && p.category !== input.category) return p;
      n++;
      if (input.percent <= 0) return { ...p, sale: undefined, updatedAt: new Date().toISOString() };
      const sale = {
        price: salePriceForPercent(p.basePrice, input.percent),
        ...(input.startsAt ? { startsAt: input.startsAt } : {}),
        ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      };
      return { ...p, sale, updatedAt: new Date().toISOString() };
    });
    const scope = `${input.department}${input.category ? `/${input.category}` : ""}`;
    audit(db, by, input.percent > 0 ? "sale.bulk" : "sale.clear", scope, input.percent > 0 ? `${input.percent}% off ${n} products${input.startsAt ? ` from ${input.startsAt}` : ""}${input.endsAt ? ` until ${input.endsAt}` : ""}` : `cleared on ${n} products`);
    await save(db);
    return n;
  });
}

export function setStock(sku: string, qty: number, by: string): Promise<void> {
  return withLock(async () => {
    const db = await load();
    const hit = findVariant(db, sku);
    if (!hit) return;
    const next = Math.max(0, Math.floor(qty));
    if (hit.variant.stock === next) return;
    audit(db, by, "stock.set", hit.product.id, `${sku}: ${hit.variant.stock} → ${next}`);
    hit.variant.stock = next;
    await save(db);
  });
}

export async function listAudit(target?: string, limit = 50): Promise<AuditEntry[]> {
  const db = await load();
  return (target ? db.audit.filter((a) => a.target === target) : db.audit).slice(0, limit);
}

// ---------------------------------------------------------------- orders

export class OrderError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
  }
}

export interface CreateOrderInput {
  idempotencyKey: string;
  lines: CartLine[];
  address: Address;
  payment: PaymentMethod;
  coupon?: string;
  notes?: string;
  customerId?: string;
}

function checkAddress(a: Address): Address {
  const r = validateAddress(a ?? {});
  if (!r.ok) throw new OrderError(r.message, r.field);
  return r.address;
}

function orderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  return `LUF-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function createOrder(input: CreateOrderInput): Promise<{ order: Order; duplicate: boolean }> {
  return withLock(async () => {
    const db = await load();

    // Idempotency: double-clicks / retries return the original order.
    const existing = db.orders.find((o) => o.idempotencyKey === input.idempotencyKey);
    if (existing) return { order: existing, duplicate: true };

    if (!input.idempotencyKey || input.idempotencyKey.length < 8) throw new OrderError("Missing idempotency key.");
    if (input.payment !== "cod" && input.payment !== "bank") throw new OrderError("Choose a payment method.", "payment");
    if (!Array.isArray(input.lines) || input.lines.length === 0) throw new OrderError("Your bag is empty.");
    if (input.lines.length > 30) throw new OrderError("Too many items in one order.");

    const address = checkAddress(input.address);

    // Merge duplicate SKUs, re-price from the live catalogue, re-validate stock.
    const merged = new Map<string, CartLine>();
    for (const l of input.lines) {
      const qty = Math.floor(Number(l.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > 10) throw new OrderError("Invalid quantity.");
      const prev = merged.get(l.sku);
      merged.set(l.sku, { productId: l.productId, sku: l.sku, qty: (prev?.qty ?? 0) + qty });
    }

    const now = Date.now();
    const items = [...merged.values()].map((l) => {
      const stored = db.products.find((x) => x.id === l.productId && x.status === "active");
      const v = stored?.variants.find((x) => x.sku === l.sku);
      if (!stored || !v) throw new OrderError("An item in your bag is no longer available.");
      const p = materialize(stored, now);
      if (!p.preOrder && v.stock < l.qty) {
        throw new OrderError(v.stock === 0 ? `${p.name} (${v.colour}, ${v.size}) just sold out.` : `Only ${v.stock} left of ${p.name} (${v.colour}, ${v.size}).`);
      }
      const photo = imagesFor(p, v.colour)[0]?.url;
      return { variant: v, item: { productId: p.id, sku: v.sku, name: p.name, size: v.size, colour: v.colour, unitPrice: p.price, qty: l.qty, garment: p.garment, hex: p.colours.find((c) => c.name === v.colour)?.hex, ...(photo ? { image: photo } : {}) } };
    });

    const totals = computeTotals(items.map((x) => x.item), { coupon: input.coupon, city: address.city });
    if (input.coupon && !totals.couponApplied) throw new OrderError(totals.couponError ?? "Coupon not valid.", "coupon");

    for (const { variant, item } of items) variant.stock = Math.max(0, variant.stock - item.qty);

    const at = new Date(now).toISOString();
    const order: Order = {
      number: orderNumber(),
      ...(input.customerId ? { customerId: input.customerId } : {}),
      idempotencyKey: input.idempotencyKey,
      createdAt: at,
      status: "pending",
      history: [{ status: "pending", at, by: "customer" }],
      items: items.map((x) => x.item),
      address,
      payment: input.payment,
      coupon: totals.couponApplied,
      totals,
      notes: input.notes?.trim().slice(0, 500) || undefined,
    };
    db.orders.unshift(order);
    await save(db);
    notify(order, "Order received");
    return { order, duplicate: false };
  });
}

export async function getOrder(number: string): Promise<Order | undefined> {
  return (await load()).orders.find((o) => o.number === number);
}

export async function trackOrder(number: string, phone: string): Promise<Order | undefined> {
  const n = normalisePhone(phone);
  const o = await getOrder(number.trim().toUpperCase());
  return o && n && o.address.phone === n ? o : undefined;
}

export async function listOrders(): Promise<Order[]> {
  return (await load()).orders;
}

export function updateOrderStatus(number: string, to: OrderStatus, by: string, note?: string): Promise<Order> {
  return withLock(async () => {
    const db = await load();
    const o = db.orders.find((x) => x.number === number);
    if (!o) throw new OrderError("Order not found.");
    if (!canTransition(o.status, to)) throw new OrderError(`Cannot move an order from ${o.status} to ${to}.`);
    if (restocks(to)) {
      for (const it of o.items) {
        const hit = findVariant(db, it.sku);
        if (hit) hit.variant.stock += it.qty;
        else audit(db, by, "stock.restock_skipped", o.number, `${it.sku} no longer exists; ${it.qty} unit(s) not restocked`);
      }
    }
    o.status = to;
    o.history.push({ status: to, at: new Date().toISOString(), by, note: note?.slice(0, 300) });
    await save(db);
    notify(o, `Status: ${to}`);
    return o;
  });
}

export function addSubscriber(contact: string): Promise<void> {
  return withLock(async () => {
    const db = await load();
    if (!db.subscribers.some((s) => s.contact === contact)) db.subscribers.push({ contact, at: new Date().toISOString() });
    await save(db);
  });
}

export function addStockAlert(sku: string, contact: string): Promise<void> {
  return withLock(async () => {
    const db = await load();
    db.stockAlerts.push({ sku, contact, at: new Date().toISOString() });
    await save(db);
  });
}

// Notification provider hook (email / SMS / WhatsApp). Logged until a provider is configured.
function notify(order: Order, event: string) {
  console.info(`[notify] ${order.number} → ${order.address.phone}: ${event}`);
}
