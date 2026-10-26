"use client";

import { errorCode } from "@app/api-client";

import { api } from "@/lib/api";
import type { ListStatus } from "@/lib/catalog";

/** Each helper returns null on success or the API error code. */
async function run(call: Promise<{ error?: unknown; response: Response }>): Promise<string | null> {
  try {
    const { error, response } = await call;
    return response.ok ? null : errorCode(error);
  } catch {
    return "network";
  }
}

export const setStatus = (animeId: number, status: ListStatus) =>
  run(api.PATCH("/me/animelist/{anime_id}", { params: { path: { anime_id: animeId } }, body: { status } }));

export const removeEntry = (animeId: number) =>
  run(api.DELETE("/me/animelist/{anime_id}", { params: { path: { anime_id: animeId } } }));
