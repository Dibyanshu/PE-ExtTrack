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

interface ReqLike {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

function getPathname(urlValue: string | undefined): string {
  try {
    return new URL(urlValue ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

function isHealthPath(pathname: string): boolean {
  return pathname === "/healthz" || pathname === "/api/healthz";
}

function getRequestHeader(
  req: ReqLike,
  headerName: string,
): string | undefined {
  const header = req.headers?.[headerName] ?? req.headers?.[headerName.toLowerCase()];
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

function applyCorsHeaders(req: ReqLike, res: ResLike): void {
  const origin = getRequestHeader(req, "origin");
  const requestHeaders = getRequestHeader(req, "access-control-request-headers");

  res.setHeader("access-control-allow-origin", origin ?? "*");
  res.setHeader("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    requestHeaders ?? "Authorization, Content-Type",
  );
  res.setHeader("access-control-max-age", "86400");
  res.setHeader("vary", "Origin, Access-Control-Request-Headers");
}

function writeJson(res: ResLike, statusCode: number, body: Record<string, unknown>): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

// Static imports are required so @vercel/node's esbuild bundler includes them.
import app from "../src/app";
import { runStartupMigrations } from "../src/lib/startup-migrations";

async function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      ensureMysqlDatabaseUrl();
      await runStartupMigrations();
      appHandler = app as unknown as (req: unknown, res: unknown) => void;
    })();
  }

  return bootPromise;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  const request = req as ReqLike;
  const response = res as ResLike;

  applyCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const pathname = getPathname(request.url);
  if (isHealthPath(pathname)) {
    writeJson(response, 200, { status: "ok" });
    return;
  }

  try {
    await boot();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "App failed to initialize";
    writeJson(response, 500, {
      error: "Initialization failed",
      detail: message,
    });
    return;
  }

  if (!appHandler) {
    writeJson(response, 500, { error: "App failed to initialize" });
    return;
  }

  appHandler(req, res);
}
