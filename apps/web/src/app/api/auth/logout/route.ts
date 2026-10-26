import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_URL } from "@/lib/config";
import { applyCookies, clearedCookies, REFRESH_COOKIE } from "@/lib/cookies";

export async function POST() {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refresh) {
    // Best effort: the cookies are cleared even if the API is down.
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  applyCookies(response.cookies, clearedCookies());
  return response;
}
