// Database setup: `npm run db:setup` (= migrate + import), or `db:migrate` / `db:import` alone.
//
// migrate  Applies db/migrations/*.sql in order, each once, inside a transaction.
// import   Fills empty tables: from data/db.json (the earlier file-based store) when
//          present, otherwise seeds the sample catalogue. Tables that already have
//          rows are left untouched, so running it again is safe.

import { promises as fs } from "node:fs";
import path from "node:path";
import pg from "pg";
import { SEED_PRODUCTS } from "../src/lib/catalog.ts";
import { insertCustomer, insertOrder, writeAudit, writeProduct } from "../src/lib/server/rows.ts";
import type { AuditEntry, Customer, Order, Product } from "../src/lib/types";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS = path.join(ROOT, "db", "migrations");
const LEGACY_JSON = path.join(ROOT, "data", "db.json");

interface LegacyDb {
  products?: Product[];
  orders?: Order[];
  customers?: Customer[];
  subscribers?: { contact: string; at: string }[];
  stockAlerts?: { sku: string; contact: string; at: string }[];
  audit?: AuditEntry[];
}

async function migrate(client: pg.PoolClient) {
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const { rows } = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
  const done = new Set(rows.map((r) => r.version));
  const files = (await fs.readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(MIGRATIONS, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  applied ${file}`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
  console.log(`Migrations up to date (${files.length} file${files.length === 1 ? "" : "s"}).`);
}

async function isEmpty(client: pg.PoolClient, table: string) {
  const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
  return rows[0].n === 0;
}

async function importData(client: pg.PoolClient) {
  let legacy: LegacyDb | undefined;
  try {
    legacy = JSON.parse(await fs.readFile(LEGACY_JSON, "utf8"));
    console.log(`Importing from ${path.relative(ROOT, LEGACY_JSON)}`);
  } catch {
    console.log("No data/db.json found: seeding the sample catalogue only.");
  }

  await client.query("BEGIN");
  try {
    const report: string[] = [];
    const step = async (table: string, label: string, fn: () => Promise<number>) => {
      if (!(await isEmpty(client, table))) return report.push(`  ${label}: skipped (table already has data)`);
      report.push(`  ${label}: ${await fn()}`);
    };

    await step("products", "products", async () => {
      const products = legacy?.products?.length ? legacy.products : SEED_PRODUCTS;
      for (const p of products) await writeProduct(client, p);
      return products.length;
    });
    await step("customers", "customers", async () => {
      for (const c of legacy?.customers ?? []) await insertCustomer(client, { ...c, addresses: c.addresses ?? [], wishlist: c.wishlist ?? [] });
      return legacy?.customers?.length ?? 0;
    });
    await step("orders", "orders", async () => {
      const ids = new Set((legacy?.customers ?? []).map((c) => c.id));
      // Oldest first, so creation order is preserved; unlink orders whose account no longer exists
      const orders = [...(legacy?.orders ?? [])].reverse();
      for (const o of orders) await insertOrder(client, { ...o, customerId: o.customerId && ids.has(o.customerId) ? o.customerId : undefined });
      return orders.length;
    });
    await step("subscribers", "newsletter subscribers", async () => {
      for (const s of legacy?.subscribers ?? []) await client.query("INSERT INTO subscribers (contact, at) VALUES ($1, $2) ON CONFLICT DO NOTHING", [s.contact, s.at]);
      return legacy?.subscribers?.length ?? 0;
    });
    await step("stock_alerts", "back-in-stock requests", async () => {
      for (const a of legacy?.stockAlerts ?? []) await client.query("INSERT INTO stock_alerts (sku, contact, at) VALUES ($1, $2, $3)", [a.sku, a.contact, a.at]);
      return legacy?.stockAlerts?.length ?? 0;
    });
    await step("audit_log", "audit log entries", async () => {
      const entries = [...(legacy?.audit ?? [])].reverse(); // stored newest-first
      for (const a of entries) await writeAudit(client, a.by, a.action, a.target, a.detail, a.at);
      return entries.length;
    });
    await client.query("COMMIT");
    console.log(report.join("\n"));
    if (legacy) console.log("Sign-in sessions were not carried over: customers and staff simply sign in again.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  const command = process.argv[2] ?? "setup";
  if (!["setup", "migrate", "import"].includes(command)) {
    console.error("Usage: node scripts/db.ts [setup|migrate|import]");
    process.exit(2);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Add it to .env.local, e.g.\n  DATABASE_URL=postgres://libas:PASSWORD@localhost:5432/libas_ul_fakhar");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    if (command !== "import") await migrate(client);
    if (command !== "migrate") await importData(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
