import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

function getMysqlDatabaseUrl(): string | undefined {
  const rawDataUrl = process.env.DATABASE_URL ?? "";
  if (rawDataUrl.startsWith("mysql://") || rawDataUrl.startsWith("mysql2://")) {
    return rawDataUrl;
  }

  if (process.env.MYSQL_DATABASE_URL) {
    return process.env.MYSQL_DATABASE_URL;
  }

  const {
    DB_HOST,
    DB_PORT = "3306",
    DB_USER,
    DB_PASSWORD = "",
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    return undefined;
  }

  const user = encodeURIComponent(DB_USER);
  const password = encodeURIComponent(DB_PASSWORD);
  const database = encodeURIComponent(DB_NAME);

  return `mysql://${user}:${password}@${DB_HOST}:${DB_PORT}/${database}`;
}

// Accept DATABASE_URL only when it is a MySQL connection string.
// Replit also injects DATABASE_URL for its managed Postgres instance, so we
// must not blindly consume it — we check for a mysql scheme first.
const dbUrl = getMysqlDatabaseUrl();

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
