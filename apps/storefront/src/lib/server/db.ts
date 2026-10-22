import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { connection } from "next/server";
import { SEED_PRODUCTS } from "../catalog";
import type { AuditEntry, Customer, Order, Product } from "../types";

// File-backed database for the MVP. One JSON document, one write lock, atomic
// saves. Modules (catalog/orders in store.ts, customers in customers.ts) share it
// so it can be swapped for PostgreSQL behind the same functions.

export interface Session {
  hash: string; // sha256 of the cookie token; the token itself is never stored
  customerId: string;
  createdAt: string;
  expiresAt: string;
}

export interface OtpRecord {
  phone: string;
  hash: string;
  expiresAt: string;
  attempts: number;
  sentAt: string[]; // recent sends, for rate limiting
}

export interface DB {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  sessions: Session[];
  otps: OtpRecord[];
  subscribers: { contact: string; at: string }[];
  stockAlerts: { sku: string; contact: string; at: string }[];
  audit: AuditEntry[];
  /** Legacy (v1): per-SKU stock overrides, folded into products on first load. */
  stock?: Record<string, number>;
}

const DB_FILE = path.join(process.cwd(), "data", "db.json");

let lock: Promise<unknown> = Promise.resolve();

/** Serialises all writes so concurrent requests can't overwrite each other (or oversell). */
export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

function migrate(raw: Partial<DB>): DB {
  const db: DB = {
    orders: raw.orders ?? [],
    products: raw.products ?? [],
    customers: raw.customers ?? [],
    sessions: raw.sessions ?? [],
    otps: raw.otps ?? [],
    subscribers: raw.subscribers ?? [],
    stockAlerts: raw.stockAlerts ?? [],
    audit: raw.audit ?? [],
  };
  if (!raw.products) {
    const legacy = raw.stock ?? {};
    db.products = SEED_PRODUCTS.map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, stock: legacy[v.sku] ?? v.stock })) }));
  }
  return db;
}

/** Raw file read with no request-time marker; safe inside `use cache`. */
export async function readDb(): Promise<DB> {
  try {
    return migrate(JSON.parse(await fs.readFile(DB_FILE, "utf8")));
  } catch {
    return migrate({});
  }
}

export async function load(): Promise<DB> {
  await connection(); // orders, stock and accounts are live data: always read at request time
  return readDb();
}

export async function save(db: DB): Promise<void> {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE); // atomic swap: readers never see a half-written file
}

export function audit(db: DB, by: string, action: string, target: string, detail?: string) {
  db.audit.unshift({ at: new Date().toISOString(), by, action, target, detail: detail?.slice(0, 500) });
  if (db.audit.length > 5000) db.audit.length = 5000;
}
