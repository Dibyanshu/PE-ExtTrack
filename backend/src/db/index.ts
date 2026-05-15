import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
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

// Pool and db are initialized lazily on first use so that importing this
// module at the top level (e.g. in a Vercel serverless function) does not
// throw when env vars are not yet available at module-load time.
let _pool: mysql.Pool | undefined;
let _db: MySql2Database<typeof schema> | undefined;

function ensureInitialized(): void {
  if (_pool) return;
  const url = getMysqlDatabaseUrl();
  if (!url) {
    throw new Error(
      "A MySQL DATABASE_URL (or MYSQL_DATABASE_URL) must be set.",
    );
  }
  _pool = mysql.createPool({ uri: url, waitForConnections: true, connectionLimit: 10 });
  _db = drizzle(_pool, { schema, mode: "default" });
}

function makeLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      ensureInitialized();
      const instance = getInstance();
      const value = (instance as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as Function).bind(instance) : value;
    },
  });
}

export const pool: mysql.Pool = makeLazyProxy(() => _pool!);
export const db: MySql2Database<typeof schema> = makeLazyProxy(() => _db!);

export * from "./schema";
