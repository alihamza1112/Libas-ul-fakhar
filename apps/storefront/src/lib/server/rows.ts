import type { Pool, PoolClient } from "pg";
import type { AuditEntry, Customer, Order, OrderStatus, PaymentMethod, Product, ProductStatus, SavedAddress } from "../types";

// SQL <-> domain mapping shared by the app (store.ts, customers.ts) and the
// setup script (scripts/db.ts). Kept free of Next.js imports for that reason.

export type Db = Pool | PoolClient;

const iso = (d: Date | string | null | undefined): string | undefined => (d ? new Date(d).toISOString() : undefined);
const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

// ---------------------------------------------------------------- products

const PRODUCT_SELECT = `
  SELECT p.*,
    COALESCE((SELECT json_agg(json_build_object('sku', v.sku, 'size', v.size, 'colour', v.colour, 'stock', v.stock) ORDER BY v.position)
              FROM variants v WHERE v.product_id = p.id), '[]') AS variants
  FROM products p`;

interface ProductRow {
  id: string;
  slug: string;
  status: ProductStatus;
  name: string;
  department: Product["department"];
  category: string;
  product_group: Product["group"];
  garment: Product["garment"];
  base_price: number;
  sale_price: number | null;
  sale_starts_at: Date | null;
  sale_ends_at: Date | null;
  colours: Product["colours"];
  sizes: string[];
  images: NonNullable<Product["images"]>;
  fabric: string;
  fit: string;
  care: string[];
  description: string;
  model_info: string | null;
  tags: string[];
  pre_order_dispatch: string | null;
  sales_rank: number;
  rating: number;
  reviews: Product["reviews"];
  bundle: Product["bundle"] | null;
  created_at: Date;
  updated_at: Date | null;
  variants: Product["variants"];
}

function rowToProduct(r: ProductRow): Product {
  const sale =
    r.sale_price !== null
      ? { price: r.sale_price, ...(r.sale_starts_at ? { startsAt: iso(r.sale_starts_at) } : {}), ...(r.sale_ends_at ? { endsAt: iso(r.sale_ends_at) } : {}) }
      : undefined;
  return {
    id: r.id,
    status: r.status,
    slug: r.slug,
    name: r.name,
    department: r.department,
    category: r.category,
    group: r.product_group,
    garment: r.garment,
    basePrice: r.base_price,
    sale,
    // Derived per request by materialize(); start at the regular price
    price: r.base_price,
    compareAt: undefined,
    colours: r.colours,
    sizes: r.sizes,
    variants: r.variants,
    ...(r.images.length ? { images: r.images } : {}),
    ...(r.bundle ? { bundle: r.bundle } : {}),
    fabric: r.fabric,
    fit: r.fit,
    care: r.care,
    description: r.description,
    modelInfo: opt(r.model_info),
    tags: r.tags,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at),
    salesRank: r.sales_rank,
    preOrder: r.pre_order_dispatch ? { dispatch: r.pre_order_dispatch } : undefined,
    rating: r.rating,
    reviews: r.reviews,
  };
}

export async function selectProducts(db: Db, where = "", params: unknown[] = []): Promise<Product[]> {
  const { rows } = await db.query<ProductRow>(`${PRODUCT_SELECT} ${where} ORDER BY p.id`, params);
  return rows.map(rowToProduct);
}

/** Inserts or replaces a product and its variants (variants not in `p` are removed). */
export async function writeProduct(db: Db, p: Product): Promise<void> {
  await db.query(
    `INSERT INTO products (id, slug, status, name, department, category, product_group, garment, base_price, sale_price,
       sale_starts_at, sale_ends_at, colours, sizes, images, fabric, fit, care, description, model_info, tags,
       pre_order_dispatch, sales_rank, rating, reviews, created_at, updated_at, bundle)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
     ON CONFLICT (id) DO UPDATE SET
       slug = EXCLUDED.slug, status = EXCLUDED.status, name = EXCLUDED.name, department = EXCLUDED.department,
       category = EXCLUDED.category, product_group = EXCLUDED.product_group, garment = EXCLUDED.garment,
       base_price = EXCLUDED.base_price, sale_price = EXCLUDED.sale_price, sale_starts_at = EXCLUDED.sale_starts_at,
       sale_ends_at = EXCLUDED.sale_ends_at, colours = EXCLUDED.colours, sizes = EXCLUDED.sizes, images = EXCLUDED.images,
       fabric = EXCLUDED.fabric, fit = EXCLUDED.fit, care = EXCLUDED.care, description = EXCLUDED.description,
       model_info = EXCLUDED.model_info, tags = EXCLUDED.tags, pre_order_dispatch = EXCLUDED.pre_order_dispatch,
       sales_rank = EXCLUDED.sales_rank, rating = EXCLUDED.rating, reviews = EXCLUDED.reviews, updated_at = EXCLUDED.updated_at,
       bundle = EXCLUDED.bundle`,
    [
      p.id, p.slug, p.status, p.name, p.department, p.category, p.group, p.garment, p.basePrice,
      p.sale?.price ?? null, p.sale?.startsAt ?? null, p.sale?.endsAt ?? null,
      JSON.stringify(p.colours), p.sizes, JSON.stringify(p.images ?? []), p.fabric, p.fit, p.care, p.description,
      p.modelInfo ?? null, p.tags, p.preOrder?.dispatch ?? null, p.salesRank, p.rating, JSON.stringify(p.reviews),
      p.createdAt, p.updatedAt ?? null, p.bundle ? JSON.stringify(p.bundle) : null,
    ],
  );
  const skus = p.variants.map((v) => v.sku);
  await db.query(`DELETE FROM variants WHERE product_id = $1 AND NOT (sku = ANY($2::text[]))`, [p.id, skus]);
  if (!p.variants.length) return;
  // One statement for all variants: arrays unnested into rows
  await db.query(
    `INSERT INTO variants (sku, product_id, colour, size, stock, position)
     SELECT v.sku, $1, v.colour, v.size, v.stock, v.position
     FROM unnest($2::text[], $3::text[], $4::text[], $5::int[], $6::int[]) AS v(sku, colour, size, stock, position)
     ON CONFLICT (sku) DO UPDATE SET product_id = EXCLUDED.product_id, colour = EXCLUDED.colour, size = EXCLUDED.size,
       stock = EXCLUDED.stock, position = EXCLUDED.position`,
    [p.id, skus, p.variants.map((v) => v.colour), p.variants.map((v) => v.size), p.variants.map((v) => v.stock), p.variants.map((_, i) => i)],
  );
}

// ---------------------------------------------------------------- orders

const ORDER_SELECT = `
  SELECT o.*,
    COALESCE((SELECT json_agg(json_build_object('productId', i.product_id, 'sku', i.sku, 'name', i.name, 'size', i.size,
                'colour', i.colour, 'unitPrice', i.unit_price, 'qty', i.qty, 'garment', i.garment, 'hex', i.hex, 'image', i.image,
                'components', i.components)
              ORDER BY i.position) FROM order_items i WHERE i.order_number = o.number), '[]') AS items,
    COALESCE((SELECT json_agg(json_build_object('status', h.status, 'at', h.at, 'by', h.by, 'note', h.note) ORDER BY h.id)
              FROM order_history h WHERE h.order_number = o.number), '[]') AS history
  FROM orders o`;

interface OrderRow {
  number: string;
  idempotency_key: string;
  customer_id: string | null;
  created_at: Date;
  status: OrderStatus;
  payment: PaymentMethod;
  coupon: string | null;
  address: Order["address"];
  totals: Order["totals"];
  notes: string | null;
  items: (Order["items"][number] & Record<string, unknown>)[];
  history: { status: OrderStatus; at: string; by: string; note: string | null }[];
}

/** json_build_object returns nulls for empty optional fields; drop them to match the domain types. */
function dropNulls<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null)) as T;
}

function rowToOrder(r: OrderRow): Order {
  return {
    number: r.number,
    ...(r.customer_id ? { customerId: r.customer_id } : {}),
    idempotencyKey: r.idempotency_key,
    createdAt: iso(r.created_at)!,
    status: r.status,
    history: r.history.map((h) => dropNulls({ status: h.status, at: iso(h.at)!, by: h.by, note: h.note })) as Order["history"],
    items: r.items.map((i) => dropNulls(i)),
    address: r.address,
    payment: r.payment,
    coupon: opt(r.coupon),
    totals: r.totals,
    notes: opt(r.notes),
  };
}

export async function selectOrders(db: Db, where = "", params: unknown[] = [], limit?: number): Promise<Order[]> {
  const { rows } = await db.query<OrderRow>(`${ORDER_SELECT} ${where} ORDER BY o.created_at DESC, o.number${limit ? ` LIMIT ${Math.floor(limit)}` : ""}`, params);
  return rows.map(rowToOrder);
}

export async function insertOrder(db: Db, o: Order): Promise<void> {
  await db.query(
    `INSERT INTO orders (number, idempotency_key, customer_id, created_at, status, payment, coupon, phone, address, totals, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [o.number, o.idempotencyKey, o.customerId ?? null, o.createdAt, o.status, o.payment, o.coupon ?? null, o.address.phone, JSON.stringify(o.address), JSON.stringify(o.totals), o.notes ?? null],
  );
  for (const [i, it] of o.items.entries()) {
    await db.query(
      `INSERT INTO order_items (order_number, position, product_id, sku, name, size, colour, unit_price, qty, garment, hex, image, components)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [o.number, i, it.productId, it.sku, it.name, it.size, it.colour, it.unitPrice, it.qty, it.garment ?? null, it.hex ?? null, it.image ?? null, it.components ? JSON.stringify(it.components) : null],
    );
  }
  for (const h of o.history) {
    await db.query(`INSERT INTO order_history (order_number, status, at, by, note) VALUES ($1,$2,$3,$4,$5)`, [o.number, h.status, h.at, h.by, h.note ?? null]);
  }
}

// ---------------------------------------------------------------- customers

const CUSTOMER_SELECT = `
  SELECT c.*,
    COALESCE((SELECT json_agg(json_build_object('id', a.id, 'label', a.label, 'name', a.name, 'phone', a.phone, 'email', a.email,
                'city', a.city, 'address', a.address, 'area', a.area, 'isDefault', a.is_default) ORDER BY a.position, a.id)
              FROM addresses a WHERE a.customer_id = c.id), '[]') AS addresses
  FROM customers c`;

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  google_sub: string | null;
  marketing_opt_in: boolean;
  wishlist: string[];
  created_at: Date;
  updated_at: Date | null;
  last_login_at: Date | null;
  addresses: (SavedAddress & Record<string, unknown>)[];
}

function rowToCustomer(r: CustomerRow): Customer {
  return dropNulls({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    googleSub: r.google_sub,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at) ?? null,
    lastLoginAt: iso(r.last_login_at) ?? null,
    addresses: r.addresses.map((a) => dropNulls(a)),
    wishlist: r.wishlist,
    marketingOptIn: r.marketing_opt_in,
  }) as unknown as Customer;
}

export async function selectCustomer(db: Db, where: string, params: unknown[]): Promise<Customer | undefined> {
  const { rows } = await db.query<CustomerRow>(`${CUSTOMER_SELECT} ${where} LIMIT 1`, params);
  return rows[0] ? rowToCustomer(rows[0]) : undefined;
}

/** Full insert of a customer and addresses (account creation and data import). */
export async function insertCustomer(db: Db, c: Customer): Promise<void> {
  await db.query(
    `INSERT INTO customers (id, name, phone, email, google_sub, marketing_opt_in, wishlist, created_at, updated_at, last_login_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
    [c.id, c.name ?? null, c.phone ?? null, c.email ?? null, c.googleSub ?? null, !!c.marketingOptIn, c.wishlist, c.createdAt, c.updatedAt ?? null, c.lastLoginAt ?? null],
  );
  for (const [i, a] of c.addresses.entries()) await insertAddress(db, c.id, a, i);
}

export async function insertAddress(db: Db, customerId: string, a: SavedAddress, position: number): Promise<void> {
  await db.query(
    `INSERT INTO addresses (id, customer_id, label, name, phone, email, city, address, area, is_default, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
    [a.id, customerId, a.label ?? null, a.name, a.phone, a.email ?? null, a.city, a.address, a.area ?? null, !!a.isDefault, position],
  );
}

// ---------------------------------------------------------------- audit

export async function writeAudit(db: Db, by: string, action: string, target: string, detail?: string, at?: string): Promise<void> {
  await db.query(`INSERT INTO audit_log (at, by, action, target, detail) VALUES (COALESCE($1::timestamptz, now()), $2, $3, $4, $5)`, [
    at ?? null, by, action, target, detail?.slice(0, 500) ?? null,
  ]);
}

export async function selectAudit(db: Db, target: string | undefined, limit: number): Promise<AuditEntry[]> {
  const { rows } = await db.query<{ at: Date; by: string; action: string; target: string; detail: string | null }>(
    `SELECT at, by, action, target, detail FROM audit_log ${target ? "WHERE target = $2" : ""} ORDER BY id DESC LIMIT $1`,
    target ? [limit, target] : [limit],
  );
  return rows.map((r) => dropNulls({ at: iso(r.at)!, by: r.by, action: r.action, target: r.target, detail: r.detail }) as AuditEntry);
}
