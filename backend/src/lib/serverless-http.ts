export interface ReqLike {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

export function getPathname(urlValue: string | undefined): string {
  try {
    return new URL(urlValue ?? "/", "http://127.0.0.1").pathname;
  } catch {
    return "/";
  }
}

export function isHealthPath(pathname: string): boolean {
  return pathname === "/healthz" || pathname === "/api/healthz";
}

function getRequestHeader(req: ReqLike, headerName: string): string | undefined {
  const header = req.headers?.[headerName] ?? req.headers?.[headerName.toLowerCase()];
  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

export function applyCorsHeaders(req: ReqLike, res: ResLike): void {
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

export function handlePreflight(req: ReqLike, res: ResLike): boolean {
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.statusCode = 204;
  res.end();
  return true;
}

export function writeJson(
  res: ResLike,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}