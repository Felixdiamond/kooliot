import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

export const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  // prepare: false is required for serverless environments where connections are
  // short-lived and may be routed through a connection pooler (e.g., RDS Proxy,
  // PgBouncer in transaction mode). Prepared statements are scoped to a
  // connection and will cause "prepared statement already exists" errors on reuse.
  prepare: false,
});

export const db = drizzle(sql, { schema });
