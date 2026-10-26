import type { Tokens } from "@app/api-client";
import { NextResponse } from "next/server";

import { API_URL } from "./config";
import { applyCookies, sessionCookies } from "./cookies";
import { FORBIDDEN_ORIGIN, isSameOrigin } from "./origin";
import { deviceHeaders } from "./session";

/** Forwards a sign-in or register call to the API and stores the tokens in httpOnly cookies. */
export async function tokenRoute(apiPath: string, request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json(FORBIDDEN_ORIGIN, { status: 403 });
  // Only JSON: a cross-site HTML form cannot send it, which blocks login CSRF.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: { code: "validation_failed", message: "Expected JSON" } }, { status: 415 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...deviceHeaders(request.headers) },
      body: await request.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: { code: "network", message: "API unreachable" } }, { status: 502 });
  }
  if (!upstream.ok) {
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  const response = new NextResponse(null, { status: 204 });
  applyCookies(response.cookies, sessionCookies((await upstream.json()) as Tokens));
  return response;
}
