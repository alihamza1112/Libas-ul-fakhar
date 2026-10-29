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
import { bundleTakes, resolveBundles } from "../bundles";
import { deleteMedia, deleteOrphans, mediaExists } from "./media";
import { cachedPool, isUniqueViolation, live, tx } from "./db";
import { insertOrder, selectAudit, selectOrders, selectProducts, writeAudit, writeProduct } from "./rows";
import type { Address, AuditEntry, CartLine, DepartmentSlug, Order, OrderStatus, PaymentMethod, Product } from "../types";

// Catalogue, inventory, orders and notifications, stored in PostgreSQL.

const CATALOG_LOCK = "catalog";

/** The current time for a request-time render (sale state, previews). */
export async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

// ---------------------------------------------------------------- catalogue reads

/** All stored products (any status), without derived pricing. For the cached storefront catalogue. */
export async function readProducts(): Promise<Product[]> {
  return selectProducts(cachedPool());
}

/** Prices everything for `now`, then derives gift boxes' price, stock and contents. */
export function priceCatalogue(products: Product[], now: number): Product[] {
  return resolveBundles(products.map((p) => materialize(p, now)));
}

/** Live view for the back office: every status, priced as of now. */
export async function adminListProducts(): Promise<Product[]> {
  return priceCatalogue(await selectProducts(await live()), Date.now());
}

export async function adminGetProduct(id: string): Promise<Product | undefined> {
  return (await adminListProducts()).find((p) => p.id === id);
}

async function activeCatalogue(db: Parameters<typeof selectProducts>[0], now: number): Promise<Product[]> {
  return priceCatalogue(await selectProducts(db, "WHERE p.status = 'active'"), now);
}

/** Live price and stock for bag lines, used to re-validate before checkout (FR-CART-06). */
export async function liveLines(lines: CartLine[]) {
  const wanted = lines.slice(0, 30);
  const products = await activeCatalogue(await live(), Date.now());
  return wanted.map((l) => {
    const p = products.find((x) => x.id === l.productId);
    const v = p?.variants.find((x) => x.sku === l.sku);
    return { sku: l.sku, stock: p && v ? (p.preOrder ? 99 : v.stock) : 0, price: p ? p.price : 0 };
  });
}

export async function skuExists(sku: string): Promise<boolean> {
  const { rowCount } = await (await live()).query("SELECT 1 FROM variants WHERE sku = $1", [sku]);
  return !!rowCount;
}

async function photoIdsInUse(): Promise<Set<string>> {
  const { rows } = await cachedPool().query<{ id: string }>("SELECT jsonb_array_elements(images) ->> 'id' AS id FROM products");
  return new Set(rows.map((r) => r.id));
}

// ---------------------------------------------------------------- catalogue writes

/** Housekeeping after uploads: drop files no product kept for a day. */
export async function cleanupUploads(): Promise<number> {
  return deleteOrphans(await photoIdsInUse(), 24 * 3600 * 1000);
}

export type SaveResult = { ok: true; product: Product } | { ok: false; errors: FieldErrors };

export async function saveProduct(input: ProductInput, by: string): Promise<SaveResult> {
  let res: SaveResult & { removed?: string[] };
  try {
    res = await tx(async (c) => {
      const all = await selectProducts(c);
      const current = input.id ? all.find((p) => p.id === input.id) : undefined;
      if (input.id && !current) return { ok: false as const, errors: { form: "This product no longer exists." } };
      const others = all.filter((p) => p.id !== current?.id);
      const v = validateProduct(input, others, current, new Date().toISOString(), nextProductId(all));
      if (!v.ok) return v;

      const p = v.product;
      // New photo ids must be real uploaded files (ids are random, so they can't be guessed)
      const added = (p.images ?? []).filter((i) => !(current?.images ?? []).some((x) => x.id === i.id));
      const missing = (await Promise.all(added.map((i) => mediaExists(i.id)))).some((ok) => !ok);
      if (missing) return { ok: false as const, errors: { images: "A photo is missing on the server. Please upload it again." } };

      await writeProduct(c, p);
      if (current) await writeAudit(c, by, "product.update", p.id, describeChanges(current, p));
      else await writeAudit(c, by, "product.create", p.id, `${p.name} · ${p.variants.length} variants · ${p.status}`);
      return { ok: true as const, product: materialize(p, Date.now()), removed: removedImageIds(current?.images, p.images) };
    }, CATALOG_LOCK);
  } catch (e) {
    // Backstop for edits racing in from another server: the constraint still holds
    if (isUniqueViolation(e, "products_slug_key")) return { ok: false, errors: { slug: "Another product already uses this URL." } };
    if (isUniqueViolation(e, "variants_pkey")) return { ok: false, errors: { variants: "A SKU is already in use by another product." } };
    throw e;
  }
  if (res.ok && res.removed?.length) {
    // Delete photo files this edit removed, unless another product still uses them
    const inUse = await photoIdsInUse();
    await deleteMedia(res.removed.filter((id) => !inUse.has(id)));
  }
  return res.ok ? { ok: true, product: res.product } : res;
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

/** CSV import: plan (validate) and, if `apply` and the plan is clean, write it all in one transaction. */
export async function importProducts(csv: string, apply: boolean, by: string): Promise<ImportPlan> {
  if (!apply) return planImport(csv, await selectProducts(await live()), new Date().toISOString());
  return tx(async (c) => {
    // Re-plan inside the lock so the import is validated against the catalogue it writes to
    const plan = planImport(csv, await selectProducts(c), new Date().toISOString());
    if (plan.errors.length) return plan;
    for (const p of plan.products) await writeProduct(c, p);
    await writeAudit(c, by, "product.import", "catalog", `${plan.created.length} created, ${plan.updated.length} updated, ${plan.variantCount} variants`);
    for (const p of plan.products) await writeAudit(c, by, plan.created.includes(p.slug) ? "product.create" : "product.update", p.id, "via CSV import");
    return plan;
  }, CATALOG_LOCK);
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
  return tx(async (c) => {
    const { rows } = await c.query<{ id: string; base_price: number }>(
      `SELECT id, base_price FROM products
       WHERE status <> 'archived' AND ($1 = 'all' OR department = $1) AND ($2::text IS NULL OR category = $2)`,
      [input.department, input.category ?? null],
    );
    const ids = rows.map((r) => r.id);
    if (input.percent <= 0) {
      await c.query("UPDATE products SET sale_price = NULL, sale_starts_at = NULL, sale_ends_at = NULL, updated_at = now() WHERE id = ANY($1::text[])", [ids]);
    } else {
      await c.query(
        `UPDATE products p SET sale_price = s.price, sale_starts_at = $3, sale_ends_at = $4, updated_at = now()
         FROM unnest($1::text[], $2::int[]) AS s(id, price) WHERE p.id = s.id`,
        [ids, rows.map((r) => salePriceForPercent(r.base_price, input.percent)), input.startsAt ?? null, input.endsAt ?? null],
      );
    }
    const scope = `${input.department}${input.category ? `/${input.category}` : ""}`;
    const n = ids.length;
    await writeAudit(c, by, input.percent > 0 ? "sale.bulk" : "sale.clear", scope, input.percent > 0 ? `${input.percent}% off ${n} products${input.startsAt ? ` from ${input.startsAt}` : ""}${input.endsAt ? ` until ${input.endsAt}` : ""}` : `cleared on ${n} products`);
    return n;
  }, CATALOG_LOCK);
}

export function setStock(sku: string, qty: number, by: string): Promise<void> {
  return tx(async (c) => {
    const { rows } = await c.query<{ stock: number; product_id: string }>("SELECT stock, product_id FROM variants WHERE sku = $1 FOR UPDATE", [sku]);
    if (!rows[0]) return;
    const next = Math.max(0, Math.floor(qty));
    if (rows[0].stock === next) return;
    await c.query("UPDATE variants SET stock = $2 WHERE sku = $1", [sku, next]);
    await writeAudit(c, by, "stock.set", rows[0].product_id, `${sku}: ${rows[0].stock} → ${next}`);
  });
}

export async function listAudit(target?: string, limit = 50): Promise<AuditEntry[]> {
  return selectAudit(await live(), target, limit);
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

async function orderByKey(key: string): Promise<Order | undefined> {
  return (await selectOrders(cachedPool(), "WHERE o.idempotency_key = $1", [key]))[0];
}

export async function createOrder(input: CreateOrderInput): Promise<{ order: Order; duplicate: boolean }> {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) throw new OrderError("Missing idempotency key.");
  // Idempotency: double-clicks / retries return the original order.
  const existing = await orderByKey(input.idempotencyKey);
  if (existing) return { order: existing, duplicate: true };

  if (input.payment !== "cod" && input.payment !== "bank") throw new OrderError("Choose a payment method.", "payment");
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new OrderError("Your bag is empty.");
  if (input.lines.length > 30) throw new OrderError("Too many items in one order.");
  const address = checkAddress(input.address);

  // Merge duplicate SKUs
  const merged = new Map<string, CartLine>();
  for (const l of input.lines) {
    const qty = Math.floor(Number(l.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 10) throw new OrderError("Invalid quantity.");
    const prev = merged.get(l.sku);
    merged.set(l.sku, { productId: String(l.productId), sku: String(l.sku), qty: (prev?.qty ?? 0) + qty });
  }
  const lines = [...merged.values()];

  try {
    const order = await tx(async (c) => {
      // Re-price from the live catalogue (gift boxes need their items too)
      const now = Date.now();
      const products = await activeCatalogue(c, now);
      const items = lines.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        const v = p?.variants.find((x) => x.sku === l.sku);
        if (!p || !v) throw new OrderError("An item in your bag is no longer available.");
        const photo = imagesFor(p, v.colour)[0]?.url;
        const contents = p.bundle ? p.bundleContents ?? [] : undefined;
        if (contents?.some((x) => !x.available)) throw new OrderError(`${p.name} is not available right now: one of its items has been removed.`);
        return {
          label: contents ? p.name : `${p.name} (${v.colour}, ${v.size})`,
          // A gift box takes stock from each item inside it, not from itself
          takes: p.bundle ? bundleTakes(p.bundle, l.qty) : [{ sku: v.sku, qty: l.qty }],
          item: {
            productId: p.id, sku: v.sku, name: p.name, size: v.size, colour: v.colour, unitPrice: p.price, qty: l.qty, garment: p.garment,
            hex: p.colours.find((x) => x.name === v.colour)?.hex, ...(photo ? { image: photo } : {}),
            ...(contents ? { components: contents.map((x) => ({ sku: x.sku, name: x.name, colour: x.colour, size: x.size, qty: x.qty })) } : {}),
          },
        };
      });

      const totals = computeTotals(items.map((x) => x.item), { coupon: input.coupon, city: address.city });
      if (input.coupon && !totals.couponApplied) throw new OrderError(totals.couponError ?? "Coupon not valid.", "coupon");

      // Atomic stock decrement: the row lock plus `stock >= qty` means concurrent
      // orders (even on different servers) can never oversell the last unit.
      const preOrderSkus = new Set(products.filter((p) => p.preOrder).flatMap((p) => p.variants.map((v) => v.sku)));
      for (const { takes, label } of items) {
        for (const t of takes) {
          if (preOrderSkus.has(t.sku)) {
            await c.query("UPDATE variants SET stock = GREATEST(stock - $2, 0) WHERE sku = $1", [t.sku, t.qty]);
            continue;
          }
          const { rowCount } = await c.query("UPDATE variants SET stock = stock - $2 WHERE sku = $1 AND stock >= $2", [t.sku, t.qty]);
          if (!rowCount) {
            const { rows } = await c.query<{ stock: number }>("SELECT stock FROM variants WHERE sku = $1", [t.sku]);
            const left = rows[0]?.stock ?? 0;
            throw new OrderError(takes.length > 1 || left === 0 ? `${label} just sold out.` : `Only ${left} left of ${label}.`);
          }
        }
      }

      const at = new Date(now).toISOString();
      const o: Order = {
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
      await insertOrder(c, o);
      return o;
    });
    notify(order, "Order received");
    return { order, duplicate: false };
  } catch (e) {
    // Two identical submissions raced: the second loses on the unique key and gets the first order
    if (isUniqueViolation(e, "orders_idempotency_key_key")) {
      const first = await orderByKey(input.idempotencyKey);
      if (first) return { order: first, duplicate: true };
    }
    throw e;
  }
}

export async function getOrder(number: string): Promise<Order | undefined> {
  return (await selectOrders(await live(), "WHERE o.number = $1", [number]))[0];
}

export async function trackOrder(number: string, phone: string): Promise<Order | undefined> {
  const n = normalisePhone(phone);
  if (!n) return undefined;
  return (await selectOrders(await live(), "WHERE o.number = $1 AND o.phone = $2", [number.trim().toUpperCase(), n]))[0];
}

export async function listOrders(): Promise<Order[]> {
  return selectOrders(await live());
}

export async function updateOrderStatus(number: string, to: OrderStatus, by: string, note?: string): Promise<Order> {
  const order = await tx(async (c) => {
    const { rows } = await c.query<{ status: OrderStatus }>("SELECT status FROM orders WHERE number = $1 FOR UPDATE", [number]);
    if (!rows[0]) throw new OrderError("Order not found.");
    if (!canTransition(rows[0].status, to)) throw new OrderError(`Cannot move an order from ${rows[0].status} to ${to}.`);
    if (restocks(to)) {
      const { rows: items } = await c.query<{ sku: string; qty: number; components: { sku: string; qty: number }[] | null }>(
        "SELECT sku, qty, components FROM order_items WHERE order_number = $1",
        [number],
      );
      // Gift boxes go back to stock as their items
      const returns = items.flatMap((it) => (it.components ? it.components.map((x) => ({ sku: x.sku, qty: x.qty * it.qty })) : [{ sku: it.sku, qty: it.qty }]));
      for (const it of returns) {
        const { rowCount } = await c.query("UPDATE variants SET stock = stock + $2 WHERE sku = $1", [it.sku, it.qty]);
        if (!rowCount) await writeAudit(c, by, "stock.restock_skipped", number, `${it.sku} no longer exists; ${it.qty} unit(s) not restocked`);
      }
    }
    await c.query("UPDATE orders SET status = $2 WHERE number = $1", [number, to]);
    await c.query("INSERT INTO order_history (order_number, status, by, note) VALUES ($1, $2, $3, $4)", [number, to, by, note?.slice(0, 300) || null]);
    return (await selectOrders(c, "WHERE o.number = $1", [number]))[0];
  });
  notify(order, `Status: ${to}`);
  return order;
}

export async function addSubscriber(contact: string): Promise<void> {
  await cachedPool().query("INSERT INTO subscribers (contact) VALUES ($1) ON CONFLICT (contact) DO NOTHING", [contact]);
}

export async function addStockAlert(sku: string, contact: string): Promise<void> {
  await cachedPool().query("INSERT INTO stock_alerts (sku, contact) VALUES ($1, $2)", [sku, contact]);
}

// Notification provider hook (email / SMS / WhatsApp). Logged until a provider is configured.
function notify(order: Order, event: string) {
  console.info(`[notify] ${order.number} → ${order.address.phone}: ${event}`);
}
