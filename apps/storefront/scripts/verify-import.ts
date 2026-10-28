// Compares PostgreSQL with data/db.json after `npm run db:setup`, using the app's
// own read code. Run: node --env-file=.env.local scripts/verify-import.ts
import { promises as fs } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import pg from "pg";
import { selectCustomer, selectOrders, selectProducts } from "../src/lib/server/rows.ts";
import type { Customer, Order, Product } from "../src/lib/types";

const legacy = JSON.parse(await fs.readFile("data/db.json", "utf8")) as { products: Product[]; orders: Order[]; customers: Customer[] };
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let problems = 0;
const report = (what: string, a: unknown, b: unknown) => {
  problems++;
  console.log(`MISMATCH ${what}\n  file: ${JSON.stringify(a)?.slice(0, 300)}\n  db:   ${JSON.stringify(b)?.slice(0, 300)}`);
};
// Derived fields are recomputed per request, and undefined vs missing keys don't matter
const clean = (o: unknown) => JSON.parse(JSON.stringify(o));
const normProduct = (p: Product) => clean({ ...p, price: undefined, compareAt: undefined, isNew: undefined, updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined });

const products = await selectProducts(pool);
console.log(`products: file ${legacy.products.length}, db ${products.length}`);
for (const lp of legacy.products) {
  const dp = products.find((p) => p.id === lp.id);
  if (!dp) { report(`product ${lp.id} missing`, lp.id, null); continue; }
  const a = normProduct(lp), b = normProduct(dp);
  for (const k of Object.keys({ ...a, ...b })) if (!isDeepStrictEqual(a[k], b[k])) report(`product ${lp.id}.${k}`, a[k], b[k]);
}

const orders = await selectOrders(pool);
console.log(`orders: file ${legacy.orders.length}, db ${orders.length}`);
for (const lo of legacy.orders) {
  const d = orders.find((o) => o.number === lo.number);
  if (!d) { report(`order ${lo.number} missing`, lo.number, null); continue; }
  const a = clean(lo), b = clean(d);
  for (const k of Object.keys({ ...a, ...b })) if (!isDeepStrictEqual(a[k], b[k])) report(`order ${lo.number}.${k}`, a[k], b[k]);
}

console.log(`customers: file ${legacy.customers.length}`);
for (const lc of legacy.customers) {
  const d = await selectCustomer(pool, "WHERE c.id = $1", [lc.id]);
  if (!d) { report(`customer ${lc.id} missing`, lc.id, null); continue; }
  const a = clean(lc), b = clean(d);
  for (const k of Object.keys({ ...a, ...b })) if (!isDeepStrictEqual(a[k], b[k])) report(`customer ${lc.id}.${k}`, a[k], b[k]);
}
const { rows } = await pool.query("SELECT sum(stock)::int AS units, count(*)::int AS variants FROM variants");
const fileUnits = legacy.products.reduce((s, p) => s + p.variants.reduce((t, v) => t + v.stock, 0), 0);
console.log(`stock units: file ${fileUnits}, db ${rows[0].units} (${rows[0].variants} variants)`);
if (fileUnits !== rows[0].units) problems++;
await pool.end();
console.log(problems ? `${problems} mismatch(es)` : "ALL DATA MATCHES");
