import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Accept DATABASE_URL only when it is a MySQL connection string.
// Replit also injects DATABASE_URL for its managed Postgres instance, so we
// must not blindly consume it — we check for a mysql scheme first.
const rawDataUrl = process.env.DATABASE_URL ?? "";
const dbUrl =
  rawDataUrl.startsWith("mysql://") || rawDataUrl.startsWith("mysql2://")
    ? rawDataUrl
    : process.env.MYSQL_DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.",
  );
}

export const pool = mysql.createPool({
  uri: dbUrl,
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(pool, { schema, mode: "default" });

export * from "./schema";
