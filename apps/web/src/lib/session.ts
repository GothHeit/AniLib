import type { Tokens } from "@app/api-client";

import { API_URL } from "./config";

// The API rotates refresh tokens and treats a second use of the same token as theft, so two
// requests (or tabs) that find an expired access token must share ONE refresh call. Callers that
// arrive just after it finished get the same result instead of reusing the spent token.
const REUSE_WINDOW_MS = 15_000;

/** "rejected": the API refused the token (sign the user out). "unavailable": try again later. */
export type RefreshResult = Tokens | "rejected" | "unavailable";

type State = {
  inflight: Map<string, Promise<RefreshResult>>;
  finished: Map<string, { result: RefreshResult; at: number }>;
};

// The proxy and the route handlers are bundled separately, so module state would be duplicated.
// Keeping it on globalThis shares one copy across every bundle in the Node process.
const g = globalThis as typeof globalThis & { __mrSession?: State };
const state = (g.__mrSession ??= { inflight: new Map(), finished: new Map() });

function prune(now: number) {
  for (const [key, value] of state.finished) if (now - value.at > REUSE_WINDOW_MS) state.finished.delete(key);
}

/** The browser details the API shows in the sessions list. Everything else is dropped. */
export function deviceHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of ["user-agent", "x-forwarded-for"]) {
    const value = headers.get(name);
    if (value) result[name] = value;
  }
  return result;
}

async function callRefresh(refreshToken: string, device: Record<string, string>): Promise<RefreshResult> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...device },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (res.ok) return (await res.json()) as Tokens;
    return res.status === 400 || res.status === 401 ? "rejected" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function refreshSession(refreshToken: string, device: Record<string, string> = {}): Promise<RefreshResult> {
  const now = Date.now();
  prune(now);
  const recent = state.finished.get(refreshToken);
  if (recent) return Promise.resolve(recent.result);
  const running = state.inflight.get(refreshToken);
  if (running) return running;

  const promise = callRefresh(refreshToken, device).then((result) => {
    state.inflight.delete(refreshToken);
    // A transient failure is never cached: the next request may succeed.
    if (result !== "unavailable") state.finished.set(refreshToken, { result, at: Date.now() });
    return result;
  });
  state.inflight.set(refreshToken, promise);
  return promise;
}

/** Test hook. */
export function resetSessionState() {
  state.inflight.clear();
  state.finished.clear();
}
