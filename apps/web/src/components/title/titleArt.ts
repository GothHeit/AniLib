import type { components } from "@app/api-client";
import { cache } from "react";

import { serverApi } from "@/lib/server-api";

export type TitleArt = components["schemas"]["TitleArtOut"];

const NONE: TitleArt = { backdrop: null, episodes: {} };

// How long the header waits for the wide art before it renders with the poster instead.
const HEADER_BUDGET_MS = 1500;

/** Episode stills, episode titles and a wide picture for a title. Empty when the lookup fails. */
export const titleArt = cache(async (id: number, locale: string): Promise<TitleArt> => {
  const api = await serverApi();
  const { data } = await api
    .GET("/anime/{anime_id}/art", {
      params: { path: { anime_id: id }, query: { lang: locale === "pt" ? "pt" : "en" } },
    })
    .catch(() => ({ data: undefined }));
  return data ?? NONE;
});

/** The wide picture, or null when it isn't known within the header's budget. */
export async function headerArt(id: number, locale: string): Promise<string | null> {
  const late = new Promise<null>((resolve) => setTimeout(() => resolve(null), HEADER_BUDGET_MS));
  const art = await Promise.race([titleArt(id, locale), late]);
  return art?.backdrop ?? null;
}
