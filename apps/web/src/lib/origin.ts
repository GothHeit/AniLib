const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

/**
 * Rejects cross-site writes. A browser always sends Origin on a POST/PUT/PATCH/DELETE, so a
 * missing one is only accepted when the browser says the request is not cross-site (or isn't a
 * browser at all). SameSite=Lax cookies already cover most cases; this is the second lock.
 */
export function isSameOrigin(request: Request): boolean {
  if (SAFE_METHODS.includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const FORBIDDEN_ORIGIN = {
  error: { code: "forbidden", message: "Cross-site request refused" },
};
