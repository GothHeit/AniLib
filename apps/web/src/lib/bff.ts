"use client";

import { errorCode } from "@app/api-client";

/** POSTs to a web server auth route. Returns the API error code on failure, or null on success. */
export async function postAuth(path: string, body: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    return errorCode(await res.json().catch(() => undefined));
  } catch {
    return "network";
  }
}
