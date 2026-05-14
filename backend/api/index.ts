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

let bootPromise: Promise<void> | null = null;
let appHandler: ((req: unknown, res: unknown) => void) | null = null;

async function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      ensureMysqlDatabaseUrl();

      const [{ default: app }, { runStartupMigrations }] = await Promise.all([
        import("../src/app"),
        import("../src/lib/startup-migrations"),
      ]);

      await runStartupMigrations();
      appHandler = app as unknown as (req: unknown, res: unknown) => void;
    })();
  }

  return bootPromise;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  await boot();

  if (!appHandler) {
    throw new Error("App failed to initialize");
  }

  appHandler(req, res);
}
