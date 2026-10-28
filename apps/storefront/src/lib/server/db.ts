import "server-only";
import { Pool, type PoolClient } from "pg";
import { connection } from "next/server";

// PostgreSQL access (BRD 5.2). One pool per server process; schema lives in
// db/migrations and is applied with `npm run db:setup`.

const globalForPg = globalThis as unknown as { lufPool?: Pool };

function pool(): Pool {
  if (!globalForPg.lufPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example) and run `npm run db:setup`.");
    // Reused across hot reloads in development so connections aren't leaked
    globalForPg.lufPool = new Pool({ connectionString, max: Number(process.env.DATABASE_POOL_MAX ?? 10) });
  }
  return globalForPg.lufPool;
}

/** For request-time reads: marks the render as dynamic, then returns the pool. */
export async function live(): Promise<Pool> {
  await connection();
  return pool();
}

/** For reads inside `"use cache"` functions, where request-time markers aren't allowed. */
export function cachedPool(): Pool {
  return pool();
}

/**
 * Runs `fn` in a transaction. `lock` takes a transaction-scoped advisory lock on
 * that key first, so writers to the same thing (the catalogue, one customer, one
 * phone number) run one at a time, even across server instances.
 */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>, lock?: string): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    if (lock) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [lock]);
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

/** True for a unique-constraint violation, optionally on a specific constraint. */
export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const err = e as { code?: string; constraint?: string };
  return err?.code === "23505" && (!constraint || err.constraint === constraint);
}
