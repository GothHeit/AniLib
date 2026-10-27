// The API paths the browser may reach through /api/proxy. Everything else (above all /auth/*,
// which the web server calls itself so it can manage the cookies) is refused.
const PREFIXES = ["anime", "home", "invites", "watch", "me", "friends", "notifications"];

export function isProxyPathAllowed(path: string[]): boolean {
  const [first, second] = path;
  if (first === "mal") return path.length === 2 && second === "link";
  if (first === "users") {
    const clean = !path.some((s) => s === "." || s === "..");
    // /users/lookup, /users/{id}/avatar and /users/{id}/profile
    return clean && ((path.length === 2 && second === "lookup") || (path.length === 3 && (path[2] === "avatar" || path[2] === "profile")));
  }
  return PREFIXES.includes(first) && path.every((segment) => segment !== "." && segment !== "..");
}

/** Error codes that mean "the access token is bad", the only 401s a refresh can fix. */
const AUTH_CODES = ["not_authenticated", "invalid_token"];

export async function isAuthFailure(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    const body = (await response.clone().json()) as { error?: { code?: string } };
    return AUTH_CODES.includes(body.error?.code ?? "");
  } catch {
    return false;
  }
}
