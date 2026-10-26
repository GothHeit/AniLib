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
import { refreshSession } from "@/lib/session";

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
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();

  const send = (token: string | undefined) => {
    const headers = new Headers();
    for (const name of FORWARD_REQUEST) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { method: request.method, headers, body, cache: "no-store", redirect: "manual" });
  };

  let setCookies: CookieSpec[] = [];
  let upstream: Response;
  try {
    upstream = await send(request.cookies.get(ACCESS_COOKIE)?.value);
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    if (upstream.status === 401 && refresh) {
      const tokens = await refreshSession(refresh);
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
  if (path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ error: { code: "validation_failed", message: "Bad path" } }, { status: 400 });
  }
  return forward(request, path);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
