import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { API_URL } from "@/lib/config";
import {
  ACCESS_COOKIE,
  applyCookies,
  clearedCookies,
  REFRESH_COOKIE,
  sessionCookies,
  type CookieSpec,
} from "@/lib/cookies";
import { readLimitedBody } from "@/lib/body-limit";
import { FORBIDDEN_ORIGIN, isSameOrigin } from "@/lib/origin";
import { isAuthFailure, isProxyPathAllowed } from "@/lib/proxy-paths";
import { deviceHeaders, refreshSession } from "@/lib/session";

// Request headers passed to the API; everything else (cookies above all) stays here.
const FORWARD_REQUEST = ["accept", "content-type", "range", "if-none-match"];
// Response headers passed back, so video seeking (206) and caching keep working.
const FORWARD_RESPONSE = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
];

async function forward(request: NextRequest, path: string[]) {
  const url = `${API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    // Only a signed-in browser gets its body read, and only up to the cap.
    if (!request.cookies.get(ACCESS_COOKIE) && !request.cookies.get(REFRESH_COOKIE)) {
      return NextResponse.json({ error: { code: "not_authenticated", message: "Not signed in" } }, { status: 401 });
    }
    const read = await readLimitedBody(request);
    if (!read) {
      return NextResponse.json({ error: { code: "too_large", message: "Request body too large" } }, { status: 413 });
    }
    body = read;
  }

  const send = (token: string | undefined) => {
    const headers = new Headers();
    for (const name of FORWARD_REQUEST) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      // Ends a long-lived stream (a watch-together room) when the browser goes away.
      signal: request.signal,
    });
  };

  let setCookies: CookieSpec[] = [];
  let upstream: Response;
  try {
    upstream = await send(request.cookies.get(ACCESS_COOKIE)?.value);
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    // Only a bad access token is worth a refresh; other 401s (an expired MAL link) would rotate it for nothing.
    if (refresh && (await isAuthFailure(upstream))) {
      const tokens = await refreshSession(refresh, deviceHeaders(request.headers));
      if (tokens === "unavailable") {
        return NextResponse.json({ error: { code: "network", message: "API unreachable" } }, { status: 502 });
      }
      if (tokens === "rejected") {
        setCookies = clearedCookies();
      } else {
        setCookies = sessionCookies(tokens);
        upstream = await send(tokens.access_token);
      }
    }
  } catch {
    return NextResponse.json({ error: { code: "network", message: "API unreachable" } }, { status: 502 });
  }

  const headers = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = new NextResponse(upstream.body, { status: upstream.status, headers });
  applyCookies(response.cookies, setCookies);
  return response;
}

type Ctx = RouteContext<"/api/proxy/[...path]">;

async function handle(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!isSameOrigin(request)) return NextResponse.json(FORBIDDEN_ORIGIN, { status: 403 });
  if (!isProxyPathAllowed(path)) {
    return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }
  return forward(request, path);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
