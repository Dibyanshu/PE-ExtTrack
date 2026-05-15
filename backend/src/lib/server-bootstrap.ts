import app from "../app";
import { runStartupMigrations } from "./startup-migrations";

function ensureMysqlDatabaseUrl(): void {
  if (
    process.env.MYSQL_DATABASE_URL ||
    process.env.DATABASE_URL?.startsWith("mysql")
  ) {
    return;
  }

  const {
    DB_HOST,
    DB_PORT = "3306",
    DB_USER,
    DB_PASSWORD = "",
    DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    return;
  }

  const user = encodeURIComponent(DB_USER);
  const password = encodeURIComponent(DB_PASSWORD);
  const database = encodeURIComponent(DB_NAME);

  process.env.MYSQL_DATABASE_URL =
    `mysql://${user}:${password}@${DB_HOST}:${DB_PORT}/${database}`;
}

let bootPromise: Promise<typeof app> | null = null;

export async function bootApp(): Promise<typeof app> {
  if (!bootPromise) {
    bootPromise = (async () => {
      ensureMysqlDatabaseUrl();
      await runStartupMigrations();
      return app;
    })();
  }

  return bootPromise;
}

export function getRequiredPort(): number {
  const rawPort = process.env.PORT;
  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: \"${rawPort}\"`);
  }

  return port;
}