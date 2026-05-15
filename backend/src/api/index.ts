import { bootApp } from "../lib/server-bootstrap";
import {
  applyCorsHeaders,
  getPathname,
  handlePreflight,
  isHealthPath,
  type ReqLike,
  type ResLike,
  writeJson,
} from "../lib/serverless-http";

let bootPromise: Promise<void> | null = null;
let appHandler: ((req: unknown, res: unknown) => void) | null = null;

async function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      const app = await bootApp();
      appHandler = app as unknown as (req: unknown, res: unknown) => void;
    })();
  }

  return bootPromise;
}

export default async function handler(req: unknown, res: unknown): Promise<void> {
  const request = req as ReqLike;
  const response = res as ResLike;

  applyCorsHeaders(request, response);

  if (handlePreflight(request, response)) {
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