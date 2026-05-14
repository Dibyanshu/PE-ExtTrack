function ensureMysqlDatabaseUrl() {
  if (process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL?.startsWith("mysql")) {
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

  process.env.MYSQL_DATABASE_URL = `mysql://${user}:${password}@${DB_HOST}:${DB_PORT}/${database}`;
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

ensureMysqlDatabaseUrl();

await import("./dist/index.mjs");